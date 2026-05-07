import SwiftUI
import PhotosUI
import UIKit

struct ProfileEditView: View {
  @Environment(\.dismiss) private var dismiss
  @EnvironmentObject private var sessionStore: SessionStore

  @State private var name = ""
  @State private var lastName = ""
  @State private var email = ""
  @State private var dni = ""
  @State private var birthDateText = ""
  @State private var gender = ""
  @State private var address = ""
  @State private var phone = ""
  @State private var nationality = ""
  @State private var maritalStatus = ""
  @State private var allergies = ""
  @State private var regularMedication = ""
  @State private var relevantDiseases = ""
  @State private var previousInjuries = ""
  @State private var physicalRestrictions = ""
  @State private var bloodGroup = ""
  @State private var primaryDoctor = ""
  @State private var doctorPhone = ""
  @State private var doctorCertificate = ""
  @State private var socialFeeActive = true
  @State private var isLoading = false
  @State private var isSaving = false
  @State private var didLoad = false
  @State private var feedbackMessage: String?
  @State private var feedbackIsError = false
  @State private var selectedProfilePhotoItem: PhotosPickerItem?
  @State private var photoFeedbackMessage: String?
  @State private var photoFeedbackIsError = false
  @State private var isUploadingPhoto = false
  @State private var photoReloadKey = UUID().uuidString

  var body: some View {
    Form {
      Section("Foto de perfil") {
        HStack(alignment: .center, spacing: 14) {
          AuthenticatedAvatarView(
            path: "/api/mobile/profile/photo",
            initials: profileInitials,
            diameter: 84,
            reloadKey: photoReloadKey
          )

          VStack(alignment: .leading, spacing: 8) {
            Text("La foto se muestra en tu perfil y en el menú.")
              .font(.footnote)
              .foregroundStyle(.secondary)

            PhotosPicker(selection: $selectedProfilePhotoItem, matching: .images) {
              Label(
                isUploadingPhoto ? "Subiendo foto..." : "Cambiar foto",
                systemImage: "camera"
              )
            }
            .disabled(isUploadingPhoto)
          }
        }

        if isUploadingPhoto {
          ProgressView("Subiendo foto...")
        }

        if let photoFeedbackMessage {
          Text(photoFeedbackMessage)
            .font(.footnote)
            .foregroundStyle(photoFeedbackIsError ? .red : .secondary)
        }
      }

      if isLoading && !didLoad {
        Section {
          HStack {
            Spacer()
            ProgressView("Cargando perfil...")
            Spacer()
          }
        }
      } else {
        Section("Datos personales") {
          TextField("Nombre", text: $name)
            .textInputAutocapitalization(.words)

          TextField("Apellido", text: $lastName)
            .textInputAutocapitalization(.words)

          TextField("DNI", text: $dni)
            .keyboardType(.numbersAndPunctuation)
        }

        Section("Contacto") {
          TextField("Email", text: $email)
            .textInputAutocapitalization(.never)
            .keyboardType(.emailAddress)
            .disableAutocorrection(true)

          TextField("Teléfono", text: $phone)
            .keyboardType(.phonePad)

          TextField("Dirección", text: $address)
        }

        Section("Otros datos") {
          TextField("Fecha de nacimiento (AAAA-MM-DD)", text: $birthDateText)
            .textInputAutocapitalization(.never)

          Picker("Género", selection: $gender) {
            ForEach(Self.genderOptions, id: \.value) { option in
              Text(option.title).tag(option.value)
            }
          }
          .pickerStyle(.menu)

          TextField("Nacionalidad", text: $nationality)
          TextField("Estado civil", text: $maritalStatus)
        }

        Section("Ficha médica") {
          TextField("Alergias", text: $allergies, axis: .vertical)
            .lineLimit(2...4)
          TextField("Medicación habitual", text: $regularMedication, axis: .vertical)
            .lineLimit(2...4)
          TextField("Enfermedades relevantes", text: $relevantDiseases, axis: .vertical)
            .lineLimit(2...4)
          TextField("Lesiones previas", text: $previousInjuries, axis: .vertical)
            .lineLimit(2...4)
          TextField("Restricciones físicas", text: $physicalRestrictions, axis: .vertical)
            .lineLimit(2...4)
          TextField("Grupo sanguíneo", text: $bloodGroup)
          TextField("Médico de cabecera", text: $primaryDoctor)
          TextField("Teléfono médico", text: $doctorPhone)

          if doctorCertificate.isEmpty {
            Text("Certificado médico: sin adjunto")
              .foregroundStyle(.secondary)
          } else {
            Text("Certificado médico: cargado")
              .foregroundStyle(.secondary)
          }
        }

        Section("Cuota social") {
          if socialFeeActive {
            Button(role: .destructive) {
              socialFeeActive = false
            } label: {
              Text("Dar de baja mi cuota social")
            }

            Text("Al guardar, se desactiva la cuota social de la cuenta.")
              .font(.footnote)
              .foregroundStyle(.secondary)
          } else {
            Text("La cuota social está inactiva.")
              .foregroundStyle(.secondary)
            Text("La reactivación se gestiona desde administración.")
              .font(.footnote)
              .foregroundStyle(.secondary)
          }
        }
      }

      if let feedbackMessage {
        Section {
          Text(feedbackMessage)
            .foregroundStyle(feedbackIsError ? .red : .secondary)
        }
      }
    }
    .navigationTitle("Editar perfil")
    .navigationBarTitleDisplayMode(.inline)
    .toolbar {
      ToolbarItem(placement: .cancellationAction) {
        Button("Cerrar") {
          dismiss()
        }
      }

      ToolbarItem(placement: .confirmationAction) {
        Button(isSaving ? "Guardando..." : "Guardar") {
          Task { await saveProfile() }
        }
        .disabled(isLoading || isSaving)
      }
    }
    .task(id: sessionStore.token) {
      await loadProfile()
    }
    .onChange(of: selectedProfilePhotoItem?.itemIdentifier) { _ in
      Task { await uploadSelectedPhoto() }
    }
  }

  private func loadProfile() async {
    guard let token = sessionStore.token else {
      feedbackMessage = "No hay sesión activa."
      feedbackIsError = true
      return
    }

    isLoading = true
    feedbackMessage = nil
    feedbackIsError = false
    defer {
      isLoading = false
      didLoad = true
    }

    do {
      let response = try await APIClient.shared.mobileProfile(token: token)
      populate(from: response.user)
      feedbackMessage = nil
      feedbackIsError = false
    } catch {
      guard !error.isCancellationError else { return }
      feedbackMessage = error.localizedDescription
      feedbackIsError = true
    }
  }

  private func populate(from user: MobileProfileResponse.User) {
    name = user.name ?? ""
    lastName = user.lastName ?? ""
    email = user.email
    dni = user.dni ?? ""
    birthDateText = displayBirthDate(user.birthDate)
    gender = user.gender ?? ""
    address = user.address ?? ""
    phone = user.phone ?? ""
    nationality = user.nationality ?? ""
    maritalStatus = user.maritalStatus ?? ""
    allergies = user.allergies ?? ""
    regularMedication = user.regularMedication ?? ""
    relevantDiseases = user.relevantDiseases ?? ""
    previousInjuries = user.previousInjuries ?? ""
    physicalRestrictions = user.physicalRestrictions ?? ""
    bloodGroup = user.bloodGroup ?? ""
    primaryDoctor = user.primaryDoctor ?? ""
    doctorPhone = user.doctorPhone ?? ""
    doctorCertificate = user.doctorCertificate ?? ""
    socialFeeActive = user.socialFeeActive
  }

  private func saveProfile() async {
    guard let token = sessionStore.token else {
      feedbackMessage = "No hay sesión activa."
      feedbackIsError = true
      return
    }

    if !birthDateText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
       normalizedBirthDate() == nil {
      feedbackMessage = "La fecha de nacimiento debe tener formato AAAA-MM-DD."
      feedbackIsError = true
      return
    }

    let normalizedBirthDate = normalizedBirthDate()

    isSaving = true
    feedbackMessage = nil
    feedbackIsError = false
    defer { isSaving = false }

    let payload = MobileProfileUpdateRequest(
      name: trimmedValue(name),
      lastName: trimmedValue(lastName),
      dni: trimmedValue(dni),
      birthDate: normalizedBirthDate,
      gender: trimmedValue(gender),
      address: trimmedValue(address),
      phone: trimmedValue(phone),
      nationality: trimmedValue(nationality),
      maritalStatus: trimmedValue(maritalStatus),
      allergies: trimmedValue(allergies),
      regularMedication: trimmedValue(regularMedication),
      relevantDiseases: trimmedValue(relevantDiseases),
      previousInjuries: trimmedValue(previousInjuries),
      physicalRestrictions: trimmedValue(physicalRestrictions),
      bloodGroup: trimmedValue(bloodGroup),
      primaryDoctor: trimmedValue(primaryDoctor),
      doctorPhone: trimmedValue(doctorPhone),
      doctorCertificate: trimmedValue(doctorCertificate),
      socialFeeActive: socialFeeActive ? nil : false,
      email: trimmedValue(email),
      password: nil
    )

    do {
      _ = try await APIClient.shared.updateMobileProfile(token: token, payload: payload)
      await sessionStore.refreshMe(silent: true)
      dismiss()
    } catch {
      guard !error.isCancellationError else { return }
      feedbackMessage = error.localizedDescription
      feedbackIsError = true
    }
  }

  private func uploadSelectedPhoto() async {
    guard let token = sessionStore.token else {
      photoFeedbackMessage = "No hay sesión activa."
      photoFeedbackIsError = true
      return
    }
    guard let selectedProfilePhotoItem else { return }

    isUploadingPhoto = true
    photoFeedbackMessage = nil
    photoFeedbackIsError = false
    defer {
      isUploadingPhoto = false
      self.selectedProfilePhotoItem = nil
    }

    do {
      guard let data = try await selectedProfilePhotoItem.loadTransferable(type: Data.self),
            let image = UIImage(data: data),
            let jpegData = image.hualasJPEGData() else {
        throw NSError(
          domain: "PhotoUpload",
          code: 1,
          userInfo: [NSLocalizedDescriptionKey: "No se pudo leer la imagen"]
        )
      }

      try await APIClient.shared.uploadProfilePhoto(token: token, imageData: jpegData)
      photoReloadKey = UUID().uuidString
      photoFeedbackMessage = "Foto actualizada"
      photoFeedbackIsError = false
      await sessionStore.refreshMe(silent: true)
    } catch {
      guard !error.isCancellationError else { return }
      photoFeedbackMessage = error.localizedDescription
      photoFeedbackIsError = true
    }
  }

  private func trimmedValue(_ value: String) -> String? {
    let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
    return trimmed.isEmpty ? nil : trimmed
  }

  private func normalizedBirthDate() -> String? {
    let trimmed = birthDateText.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty else { return nil }
    guard let date = Self.birthDateFormatter.date(from: trimmed) else { return nil }
    return Self.birthDateFormatter.string(from: date)
  }

  private var profileInitials: String {
    let first = name.first.map(String.init) ?? ""
    let last = lastName.first.map(String.init) ?? ""
    let combined = "\(first)\(last)"
    return combined.isEmpty ? "U" : combined.uppercased()
  }

  private func displayBirthDate(_ value: String?) -> String {
    guard let value, !value.isEmpty else { return "" }

    if let date = Self.isoDateFormatter.date(from: value) ??
      Self.birthDateFormatter.date(from: value) {
      return Self.birthDateFormatter.string(from: date)
    }

    return value
  }

  private struct GenderOption {
    let title: String
    let value: String
  }

  private static let genderOptions: [GenderOption] = [
    GenderOption(title: "Sin definir", value: ""),
    GenderOption(title: "Femenino", value: "FEMALE"),
    GenderOption(title: "Masculino", value: "MALE"),
    GenderOption(title: "No binario", value: "NON_BINARY"),
    GenderOption(title: "Prefiero no decir", value: "UNDISCLOSED"),
    GenderOption(title: "Otro", value: "OTHER"),
  ]

  private static let birthDateFormatter: DateFormatter = {
    let formatter = DateFormatter()
    formatter.calendar = Calendar(identifier: .gregorian)
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.timeZone = TimeZone(secondsFromGMT: 0)
    formatter.dateFormat = "yyyy-MM-dd"
    return formatter
  }()

  private static let isoDateFormatter: ISO8601DateFormatter = {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter
  }()
}
