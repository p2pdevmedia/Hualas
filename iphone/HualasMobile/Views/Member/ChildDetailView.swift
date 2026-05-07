import SwiftUI
import PhotosUI
import UIKit

struct ChildDetailView: View {
  @EnvironmentObject private var sessionStore: SessionStore
  @State private var child: MobileChildrenResponse.Child?
  @State private var isLoading = false
  @State private var errorMessage: String?
  @State private var showingEditor = false
  @State private var selectedPhotoItem: PhotosPickerItem?
  @State private var photoFeedbackMessage: String?
  @State private var photoFeedbackIsError = false
  @State private var isUploadingPhoto = false
  @State private var photoReloadKey = UUID().uuidString

  let childId: String
  let onChildUpdated: (MobileChildrenResponse.Child) -> Void

  init(
    childId: String,
    child: MobileChildrenResponse.Child? = nil,
    onChildUpdated: @escaping (MobileChildrenResponse.Child) -> Void = { _ in }
  ) {
    self.childId = childId
    self.onChildUpdated = onChildUpdated
    _child = State(initialValue: child)
  }

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 16) {
        if isLoading && child == nil {
          ProgressView("Cargando hijo...")
            .frame(maxWidth: .infinity, alignment: .center)
            .padding(.vertical, 24)
        } else if let child {
          headerCard(child)
          photoSection
          detailsCard(child)
        }

        if let errorMessage {
          Text(errorMessage)
            .font(.footnote)
            .foregroundStyle(.red)
        }
      }
      .padding()
    }
    .navigationTitle(navigationTitleText)
    .navigationBarTitleDisplayMode(.inline)
    .toolbar {
      ToolbarItem(placement: .topBarTrailing) {
        Button("Editar") {
          showingEditor = true
        }
        .disabled(child == nil)
      }
    }
    .task(id: childId) {
      await load()
    }
    .refreshable {
      await load()
    }
    .onChange(of: selectedPhotoItem?.itemIdentifier) { _ in
      Task { await uploadSelectedPhoto() }
    }
    .sheet(isPresented: $showingEditor) {
      if let child {
        NavigationStack {
          ChildFormView(mode: .edit(child)) { updatedChild in
            self.child = updatedChild
            onChildUpdated(updatedChild)
          }
        }
      }
    }
  }

  private var navigationTitleText: String {
    guard let name = child?.fullName.trimmingCharacters(in: .whitespacesAndNewlines),
          !name.isEmpty else {
      return "Hijo"
    }

    return name
  }

  private func headerCard(_ child: MobileChildrenResponse.Child) -> some View {
    infoCard {
      HStack(alignment: .center, spacing: 14) {
        AuthenticatedAvatarView(
          path: "/api/mobile/children/\(child.id)/photo",
          initials: child.initials,
          diameter: 60,
          reloadKey: photoReloadKey
        )

        VStack(alignment: .leading, spacing: 4) {
          Text(child.fullName.isEmpty ? "Sin nombre" : child.fullName)
            .font(.title3.bold())

          if let birthDate = formattedBirthDate(child.birthDate) {
            Text("Nacimiento: \(birthDate)")
              .font(.footnote)
              .foregroundStyle(.secondary)
          }

          if let age = ageLabel(for: child.birthDate) {
            Text(age)
              .font(.footnote.weight(.semibold))
              .foregroundStyle(.secondary)
          }
        }
      }
    }
  }

  private var photoSection: some View {
    infoCard {
      VStack(alignment: .leading, spacing: 12) {
        Text("Foto de perfil")
          .font(.headline)

        Text("Podés cambiar la foto del hijo desde acá.")
          .font(.footnote)
          .foregroundStyle(.secondary)

        PhotosPicker(selection: $selectedPhotoItem, matching: .images) {
          Label(
            isUploadingPhoto ? "Subiendo foto..." : "Cambiar foto",
            systemImage: "camera"
          )
        }
        .disabled(isUploadingPhoto)

        if isUploadingPhoto {
          ProgressView("Subiendo foto...")
        }

        if let photoFeedbackMessage {
          Text(photoFeedbackMessage)
            .font(.footnote)
            .foregroundStyle(photoFeedbackIsError ? .red : .secondary)
        }
      }
    }
  }

  private func detailsCard(_ child: MobileChildrenResponse.Child) -> some View {
    VStack(alignment: .leading, spacing: 12) {
      detailSection(title: "Datos personales") {
        detailRow(title: "Nombre", value: child.name)
        detailRow(title: "Apellido", value: child.lastName)
        detailRow(title: "Fecha de nacimiento", value: formattedBirthDate(child.birthDate))
        detailRow(title: "Género", value: genderLabel(child.gender))
        detailRow(title: "Domicilio", value: child.address)
        detailRow(title: "Nacionalidad", value: child.nationality)
        detailRow(title: "Estado civil", value: child.maritalStatus)
      }

      detailSection(title: "Documentación") {
        detailRow(title: "Tipo de documento", value: child.documentType)
        detailRow(title: "Número de documento", value: child.documentNumber)
        detailRow(title: "Foto de perfil", value: attachmentLabel(child.profilePhoto))
        detailRow(title: "Foto frontal", value: attachmentLabel(child.documentFrontPhoto))
        detailRow(title: "Foto trasera", value: attachmentLabel(child.documentBackPhoto))
        detailRow(title: "Certificado médico", value: attachmentLabel(child.doctorCertificate))
      }

      detailSection(title: "Ficha médica") {
        detailRow(title: "Alergias", value: child.allergies, isMultiline: true)
        detailRow(title: "Medicación habitual", value: child.regularMedication, isMultiline: true)
        detailRow(title: "Enfermedades relevantes", value: child.relevantDiseases, isMultiline: true)
        detailRow(title: "Lesiones previas", value: child.previousInjuries, isMultiline: true)
        detailRow(title: "Restricciones físicas", value: child.physicalRestrictions, isMultiline: true)
        detailRow(title: "Grupo sanguíneo", value: child.bloodGroup)
        detailRow(title: "Médico de cabecera", value: child.primaryDoctor)
        detailRow(title: "Teléfono médico", value: child.doctorPhone)
        detailRow(title: "Observaciones", value: child.observations, isMultiline: true)
      }
    }
  }

  private func load() async {
    guard let token = sessionStore.token else {
      errorMessage = "No hay sesión activa."
      return
    }

    isLoading = true
    errorMessage = nil
    defer { isLoading = false }

    do {
      child = try await APIClient.shared.child(token: token, childId: childId)
    } catch {
      guard !error.isCancellationError else { return }
      errorMessage = error.localizedDescription
      print("[children] detail load failed", error)
    }
  }

  private func infoCard<Content: View>(@ViewBuilder content: () -> Content) -> some View {
    content()
      .frame(maxWidth: .infinity, alignment: .leading)
      .padding()
      .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 18))
  }

  private func detailSection<Content: View>(
    title: String,
    @ViewBuilder content: () -> Content
  ) -> some View {
    infoCard {
      VStack(alignment: .leading, spacing: 12) {
        Text(title)
          .font(.headline)

        content()
      }
    }
  }

  private func detailRow(
    title: String,
    value: String?,
    isMultiline: Bool = false
  ) -> some View {
    VStack(alignment: .leading, spacing: 2) {
      Text(title)
        .font(.caption.weight(.semibold))
        .foregroundStyle(.secondary)

      Text(displayValue(value))
        .font(.subheadline)
        .foregroundStyle(value?.isEmpty == false ? .primary : .secondary)
        .fixedSize(horizontal: false, vertical: true)
        .lineLimit(isMultiline ? nil : 2)
    }
  }

  private func displayValue(_ value: String?) -> String {
    guard let value, !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
      return "Sin dato"
    }

    return value
  }

  private func attachmentLabel(_ value: String?) -> String? {
    guard let value, !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
      return nil
    }

    return "Adjunto cargado"
  }

  private func genderLabel(_ value: String?) -> String? {
    guard let value, !value.isEmpty else { return nil }

    switch value {
    case "FEMALE":
      return "Femenino"
    case "MALE":
      return "Masculino"
    case "NON_BINARY":
      return "No binario"
    case "UNDISCLOSED":
      return "Prefiere no decirlo"
    case "OTHER":
      return "Otro"
    default:
      return value
    }
  }

  private func formattedBirthDate(_ value: String?) -> String? {
    guard let value, !value.isEmpty,
          let date = Self.birthDateFormatter.date(from: value) else {
      return nil
    }

    return Self.displayBirthDateFormatter.string(from: date)
  }

  private func ageLabel(for birthDate: String?) -> String? {
    guard let birthDate,
          let date = Self.birthDateFormatter.date(from: birthDate) else {
      return nil
    }

    let calendar = Calendar(identifier: .gregorian)
    let today = Date()
    var age = calendar.component(.year, from: today) - calendar.component(.year, from: date)
    let monthDiff = calendar.component(.month, from: today) - calendar.component(.month, from: date)
    let dayDiff = calendar.component(.day, from: today) - calendar.component(.day, from: date)

    if monthDiff < 0 || (monthDiff == 0 && dayDiff < 0) {
      age -= 1
    }

    guard age >= 0 else { return nil }
    return "\(age) años"
  }

  private func uploadSelectedPhoto() async {
    guard let child else { return }
    guard let token = sessionStore.token else {
      photoFeedbackMessage = "No hay sesión activa."
      photoFeedbackIsError = true
      return
    }
    guard let selectedPhotoItem else { return }

    isUploadingPhoto = true
    photoFeedbackMessage = nil
    photoFeedbackIsError = false
    defer {
      isUploadingPhoto = false
      self.selectedPhotoItem = nil
    }

    do {
      guard let data = try await selectedPhotoItem.loadTransferable(type: Data.self),
            let image = UIImage(data: data),
            let jpegData = image.hualasJPEGData() else {
        throw NSError(domain: "PhotoUpload", code: 1, userInfo: [NSLocalizedDescriptionKey: "No se pudo leer la imagen"])
      }

      let updated = try await APIClient.shared.uploadChildPhoto(
        token: token,
        childId: child.id,
        imageData: jpegData
      )
      photoReloadKey = UUID().uuidString
      photoFeedbackMessage = "Foto actualizada"
      photoFeedbackIsError = false
      self.child = updated
      onChildUpdated(updated)
    } catch {
      guard !error.isCancellationError else { return }
      photoFeedbackMessage = error.localizedDescription
      photoFeedbackIsError = true
    }
  }

  private static let birthDateFormatter: DateFormatter = {
    let formatter = DateFormatter()
    formatter.calendar = Calendar(identifier: .gregorian)
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.timeZone = TimeZone(secondsFromGMT: 0)
    formatter.dateFormat = "yyyy-MM-dd"
    return formatter
  }()

  private static let displayBirthDateFormatter: DateFormatter = {
    let formatter = DateFormatter()
    formatter.calendar = Calendar(identifier: .gregorian)
    formatter.locale = Locale(identifier: "es_AR")
    formatter.timeZone = TimeZone(secondsFromGMT: 0)
    formatter.dateFormat = "dd/MM/yyyy"
    return formatter
  }()
}
