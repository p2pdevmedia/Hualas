import SwiftUI

enum ChildFormMode {
  case create
  case edit(MobileChildrenResponse.Child)

  var navigationTitle: String {
    switch self {
    case .create:
      return "Agregar hijo"
    case .edit:
      return "Editar hijo"
    }
  }

  var primaryActionTitle: String {
    switch self {
    case .create:
      return "Agregar"
    case .edit:
      return "Guardar"
    }
  }
}

struct ChildFormView: View {
  @Environment(\.dismiss) private var dismiss
  @EnvironmentObject private var sessionStore: SessionStore

  let mode: ChildFormMode
  let onSaved: (MobileChildrenResponse.Child) -> Void

  @State private var draft: ChildDraft
  @State private var isSaving = false
  @State private var feedbackMessage: String?
  @State private var feedbackIsError = false

  init(
    mode: ChildFormMode,
    onSaved: @escaping (MobileChildrenResponse.Child) -> Void
  ) {
    self.mode = mode
    self.onSaved = onSaved
    _draft = State(initialValue: ChildDraft(mode: mode))
  }

  var body: some View {
    Form {
      Section("Datos personales") {
        TextField("Nombre", text: $draft.name)
          .textInputAutocapitalization(.words)
        TextField("Apellido", text: $draft.lastName)
          .textInputAutocapitalization(.words)
        TextField("Fecha de nacimiento (AAAA-MM-DD)", text: $draft.birthDate)
          .textInputAutocapitalization(.never)
        Picker("Género", selection: $draft.gender) {
          ForEach(Self.genderOptions, id: \.value) { option in
            Text(option.title).tag(option.value)
          }
        }
        .pickerStyle(.menu)
        TextField("Domicilio", text: $draft.address)
        TextField("Nacionalidad", text: $draft.nationality)
        TextField("Estado civil", text: $draft.maritalStatus)
      }

      Section("Documentación") {
        Picker("Tipo de documento", selection: $draft.documentType) {
          ForEach(Self.documentTypeOptions, id: \.value) { option in
            Text(option.title).tag(option.value)
          }
        }
        .pickerStyle(.menu)

        TextField("Número de documento", text: $draft.documentNumber)

        Text("Las fotos de documento y la foto de perfil se conservan si ya existen en la ficha.")
          .font(.footnote)
          .foregroundStyle(.secondary)
      }

      Section("Ficha médica") {
        TextField("Alergias", text: $draft.allergies, axis: .vertical)
          .lineLimit(2...4)
        TextField("Medicación habitual", text: $draft.regularMedication, axis: .vertical)
          .lineLimit(2...4)
        TextField("Enfermedades relevantes", text: $draft.relevantDiseases, axis: .vertical)
          .lineLimit(2...4)
        TextField("Lesiones previas", text: $draft.previousInjuries, axis: .vertical)
          .lineLimit(2...4)
        TextField("Restricciones físicas", text: $draft.physicalRestrictions, axis: .vertical)
          .lineLimit(2...4)
        TextField("Grupo sanguíneo", text: $draft.bloodGroup)
        TextField("Médico de cabecera", text: $draft.primaryDoctor)
        TextField("Teléfono médico", text: $draft.doctorPhone)
        TextField("Observaciones", text: $draft.observations, axis: .vertical)
          .lineLimit(2...4)
      }

      if let feedbackMessage {
        Section {
          Text(feedbackMessage)
            .foregroundStyle(feedbackIsError ? .red : .secondary)
        }
      }
    }
    .navigationTitle(mode.navigationTitle)
    .navigationBarTitleDisplayMode(.inline)
    .toolbar {
      ToolbarItem(placement: .cancellationAction) {
        Button("Cerrar") {
          dismiss()
        }
      }

      ToolbarItem(placement: .confirmationAction) {
        Button(isSaving ? "Guardando..." : mode.primaryActionTitle) {
          Task { await saveChild() }
        }
        .disabled(isSaving)
      }
    }
  }

  private func saveChild() async {
    guard let token = sessionStore.token else {
      feedbackMessage = "No hay sesión activa."
      feedbackIsError = true
      return
    }

    let trimmedName = draft.name.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmedName.isEmpty else {
      feedbackMessage = "El nombre es obligatorio."
      feedbackIsError = true
      return
    }

    if !draft.birthDate.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
       !Self.birthDateFormatter.isValid(draft.birthDate) {
      feedbackMessage = "La fecha de nacimiento debe tener formato AAAA-MM-DD."
      feedbackIsError = true
      return
    }

    isSaving = true
    feedbackMessage = nil
    feedbackIsError = false
    defer { isSaving = false }

    let payload = draft.makeRequest(name: trimmedName)

    do {
      let savedChild: MobileChildrenResponse.Child
      switch mode {
      case .create:
        savedChild = try await APIClient.shared.createChild(token: token, payload: payload)
      case .edit(let existingChild):
        savedChild = try await APIClient.shared.updateChild(
          token: token,
          childId: existingChild.id,
          payload: payload
        )
      }

      onSaved(savedChild)
      dismiss()
    } catch {
      feedbackMessage = error.localizedDescription
      feedbackIsError = true
    }
  }

  private struct PickerOption {
    let title: String
    let value: String
  }

  private static let genderOptions: [PickerOption] = [
    PickerOption(title: "Sin definir", value: ""),
    PickerOption(title: "Femenino", value: "FEMALE"),
    PickerOption(title: "Masculino", value: "MALE"),
    PickerOption(title: "No binario", value: "NON_BINARY"),
    PickerOption(title: "Prefiero no decir", value: "UNDISCLOSED"),
    PickerOption(title: "Otro", value: "OTHER"),
  ]

  private static let documentTypeOptions: [PickerOption] = [
    PickerOption(title: "Sin definir", value: ""),
    PickerOption(title: "DNI", value: "DNI"),
    PickerOption(title: "Pasaporte", value: "PASAPORTE"),
    PickerOption(title: "Otro", value: "OTRO"),
  ]

  private static let birthDateFormatter: DateFormatter = {
    let formatter = DateFormatter()
    formatter.calendar = Calendar(identifier: .gregorian)
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.timeZone = TimeZone(secondsFromGMT: 0)
    formatter.dateFormat = "yyyy-MM-dd"
    return formatter
  }()
}

private struct ChildDraft {
  var name = ""
  var lastName = ""
  var profilePhoto = ""
  var documentType = ""
  var documentNumber = ""
  var documentFrontPhoto = ""
  var documentBackPhoto = ""
  var birthDate = ""
  var address = ""
  var gender = ""
  var nationality = ""
  var maritalStatus = ""
  var allergies = ""
  var regularMedication = ""
  var relevantDiseases = ""
  var previousInjuries = ""
  var physicalRestrictions = ""
  var bloodGroup = ""
  var primaryDoctor = ""
  var doctorPhone = ""
  var doctorCertificate = ""
  var observations = ""

  init(mode: ChildFormMode) {
    switch mode {
    case .create:
      break
    case .edit(let child):
      name = child.name
      lastName = child.lastName ?? ""
      documentType = child.documentType ?? ""
      documentNumber = child.documentNumber ?? ""
      birthDate = child.birthDate ?? ""
      address = child.address ?? ""
      gender = child.gender ?? ""
      nationality = child.nationality ?? ""
      maritalStatus = child.maritalStatus ?? ""
      allergies = child.allergies ?? ""
      regularMedication = child.regularMedication ?? ""
      relevantDiseases = child.relevantDiseases ?? ""
      previousInjuries = child.previousInjuries ?? ""
      physicalRestrictions = child.physicalRestrictions ?? ""
      bloodGroup = child.bloodGroup ?? ""
      primaryDoctor = child.primaryDoctor ?? ""
      doctorPhone = child.doctorPhone ?? ""
      observations = child.observations ?? ""
    }
  }

  func makeRequest(name: String) -> MobileChildUpsertRequest {
    MobileChildUpsertRequest(
      name: name,
      lastName: trimmedOrNil(lastName),
      profilePhoto: trimmedOrNil(profilePhoto),
      documentType: trimmedOrNil(documentType),
      documentNumber: trimmedOrNil(documentNumber),
      documentFrontPhoto: trimmedOrNil(documentFrontPhoto),
      documentBackPhoto: trimmedOrNil(documentBackPhoto),
      birthDate: trimmedOrNil(birthDate),
      address: trimmedOrNil(address),
      gender: trimmedOrNil(gender),
      nationality: trimmedOrNil(nationality),
      maritalStatus: trimmedOrNil(maritalStatus),
      allergies: trimmedOrNil(allergies),
      regularMedication: trimmedOrNil(regularMedication),
      relevantDiseases: trimmedOrNil(relevantDiseases),
      previousInjuries: trimmedOrNil(previousInjuries),
      physicalRestrictions: trimmedOrNil(physicalRestrictions),
      bloodGroup: trimmedOrNil(bloodGroup),
      primaryDoctor: trimmedOrNil(primaryDoctor),
      doctorPhone: trimmedOrNil(doctorPhone),
      doctorCertificate: trimmedOrNil(doctorCertificate),
      observations: trimmedOrNil(observations)
    )
  }

  private func trimmedOrNil(_ value: String) -> String? {
    let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
    return trimmed.isEmpty ? nil : trimmed
  }
}

private extension DateFormatter {
  func isValid(_ value: String) -> Bool {
    date(from: value) != nil
  }
}
