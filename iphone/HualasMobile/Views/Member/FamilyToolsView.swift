import SwiftUI

struct AddTutorView: View {
  @EnvironmentObject private var sessionStore: SessionStore

  @State private var email = ""
  @State private var relationship: MobileFamilyRelationship = .parent
  @State private var isSaving = false
  @State private var feedbackMessage: String?
  @State private var feedbackIsError = false

  var body: some View {
    Form {
      Section("Agregar tutor") {
        Text("Sumá a otra madre, padre o tutor al grupo familiar usando su email.")
          .font(.footnote)
          .foregroundStyle(.secondary)
      }

      Section("Datos") {
        TextField("Email", text: $email)
          .textInputAutocapitalization(.never)
          .keyboardType(.emailAddress)
          .autocorrectionDisabled()

        Picker("Relación", selection: $relationship) {
          ForEach(MobileFamilyRelationship.allCases, id: \.self) { option in
            Text(option.label).tag(option)
          }
        }
        .pickerStyle(.menu)
      }

      if let feedbackMessage {
        Section {
          Text(feedbackMessage)
            .foregroundStyle(feedbackIsError ? .red : .secondary)
        }
      }

      Section {
        Button {
          Task { await saveTutor() }
        } label: {
          Text(isSaving ? "Agregando..." : "Agregar tutor")
            .frame(maxWidth: .infinity, alignment: .center)
        }
        .disabled(isSaving)
      }
    }
    .navigationTitle("Agregar tutor")
    .navigationBarTitleDisplayMode(.inline)
  }

  private func saveTutor() async {
    guard let token = sessionStore.token else {
      feedbackMessage = "No hay sesión activa."
      feedbackIsError = true
      return
    }

    let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmedEmail.isEmpty else {
      feedbackMessage = "Ingresá un email."
      feedbackIsError = true
      return
    }

    isSaving = true
    feedbackMessage = nil
    feedbackIsError = false
    defer { isSaving = false }

    do {
      try await APIClient.shared.addFamilyGroupMember(
        token: token,
        email: trimmedEmail,
        relationship: relationship
      )
      email = ""
      relationship = .parent
      feedbackMessage = "Tutor agregado al grupo familiar."
      feedbackIsError = false
    } catch {
      feedbackMessage = error.localizedDescription
      feedbackIsError = true
      print("[family] add tutor failed", error)
    }
  }
}

struct PickupNoticesView: View {
  @EnvironmentObject private var sessionStore: SessionStore

  @State private var notices: [MobilePickupNoticesResponse.Notice] = []
  @State private var options: MobilePickupNoticeOptionsResponse?
  @State private var isLoading = false
  @State private var errorMessage: String?
  @State private var editorContext: PickupNoticeEditorContext?

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 16) {
        infoCard {
          VStack(alignment: .leading, spacing: 10) {
            Text("Avisos de retiro")
              .font(.headline)
            Text("Creá y administrá los avisos para informar quién retira a tu hijo en una actividad futura.")
              .font(.footnote)
              .foregroundStyle(.secondary)

            Button {
              editorContext = .create
            } label: {
              Label("Crear aviso", systemImage: "plus.circle.fill")
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .disabled(!canCreateNotice)

            if !canCreateNotice {
              Text("Necesitás al menos un hijo y una actividad futura para crear un aviso.")
                .font(.footnote)
                .foregroundStyle(.secondary)
            }
          }
        }

        if isLoading && notices.isEmpty {
          ProgressView("Cargando avisos...")
            .frame(maxWidth: .infinity, alignment: .center)
            .padding(.vertical, 12)
        } else if notices.isEmpty {
          infoCard {
            VStack(alignment: .leading, spacing: 6) {
              Text("Todavía no hay avisos")
                .font(.headline)
              Text("Cuando crees uno, va a aparecer acá para consultarlo o modificarlo.")
                .font(.footnote)
                .foregroundStyle(.secondary)
            }
          }
        } else {
          VStack(spacing: 12) {
            ForEach(notices) { notice in
              Button {
                editorContext = .edit(notice)
              } label: {
                noticeCard(notice)
              }
              .buttonStyle(.plain)
            }
          }
        }

        if let errorMessage {
          Text(errorMessage)
            .font(.footnote)
            .foregroundStyle(.red)
        }
      }
      .padding()
    }
    .navigationTitle("Avisos de retiro")
    .navigationBarTitleDisplayMode(.inline)
    .task {
      await load()
    }
    .refreshable {
      await load()
    }
    .sheet(item: $editorContext) { context in
      NavigationStack {
        PickupNoticeEditorView(
          context: context,
          options: options,
          onSaved: {
            Task { await load() }
          },
          onDeleted: {
            Task { await load() }
          }
        )
      }
    }
  }

  private var canCreateNotice: Bool {
    guard let options else { return false }
    return !options.children.isEmpty && !options.activityDays.isEmpty
  }

  private func noticeCard(_ notice: MobilePickupNoticesResponse.Notice) -> some View {
    infoCard {
      VStack(alignment: .leading, spacing: 8) {
        HStack(alignment: .top) {
          VStack(alignment: .leading, spacing: 2) {
            Text(notice.activityDayLabel)
              .font(.headline)
              .foregroundStyle(.primary)
              .multilineTextAlignment(.leading)

            Text("Hijo: \(notice.childLabel)")
              .font(.footnote)
              .foregroundStyle(.secondary)
          }

          Spacer()

          Image(systemName: "chevron.right")
            .font(.caption.weight(.semibold))
            .foregroundStyle(.tertiary)
        }

        Text("Retira: \(notice.alternatePersonLabel)")
          .font(.footnote.weight(.semibold))
          .foregroundStyle(Color.accentColor)

        if !notice.description.isEmpty {
          Text(notice.description)
            .font(.footnote)
            .foregroundStyle(.secondary)
            .lineLimit(3)
        }
      }
    }
  }

  private func load() async {
    guard let token = sessionStore.token else { return }

    isLoading = true
    errorMessage = nil
    defer { isLoading = false }

    async let noticesRequest = APIClient.shared.pickupNotices(token: token)
    async let optionsRequest = APIClient.shared.pickupNoticeOptions(token: token)

    do {
      notices = try await noticesRequest.notices
    } catch {
      guard !error.isCancellationError else { return }
      errorMessage = error.localizedDescription
      print("[pickup notices] load notices failed", error)
    }

    do {
      options = try await optionsRequest
    } catch {
      guard !error.isCancellationError else { return }
      errorMessage = error.localizedDescription
      print("[pickup notices] load options failed", error)
    }
  }

  private func infoCard<Content: View>(@ViewBuilder content: () -> Content) -> some View {
    content()
      .frame(maxWidth: .infinity, alignment: .leading)
      .padding()
      .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 18))
  }
}

private struct PickupNoticeEditorContext: Identifiable {
  enum Mode {
    case create
    case edit(MobilePickupNoticesResponse.Notice)
  }

  let id = UUID()
  let mode: Mode

  static var create: PickupNoticeEditorContext {
    PickupNoticeEditorContext(mode: .create)
  }

  static func edit(_ notice: MobilePickupNoticesResponse.Notice) -> PickupNoticeEditorContext {
    PickupNoticeEditorContext(mode: .edit(notice))
  }

  var isEditing: Bool {
    if case .edit = mode { return true }
    return false
  }

  var notice: MobilePickupNoticesResponse.Notice? {
    if case .edit(let notice) = mode { return notice }
    return nil
  }

  var navigationTitle: String {
    isEditing ? "Editar aviso" : "Crear aviso"
  }
}

private enum PickupPersonEntryMode: String, CaseIterable, Identifiable {
  case contact
  case name

  var id: String { rawValue }

  var label: String {
    switch self {
    case .contact:
      return "Contacto"
    case .name:
      return "Nombre"
    }
  }
}

private struct PickupNoticeDraft {
  var childId = ""
  var activityDayId = ""
  var alternatePersonUserId = ""
  var alternatePersonName = ""
  var description = ""

  init(
    context: PickupNoticeEditorContext,
    options: MobilePickupNoticeOptionsResponse?
  ) {
    switch context.mode {
    case .create:
      childId = options?.children.first?.id ?? ""
      activityDayId = options?.activityDays.first?.id ?? ""
    case .edit(let notice):
      childId = notice.childId
      activityDayId = notice.activityDayId
      alternatePersonUserId = notice.alternatePersonUserId ?? ""
      alternatePersonName = notice.alternatePersonName ?? ""
      description = notice.description
    }
  }

  func makeRequest() -> MobilePickupNoticeUpsertRequest {
    MobilePickupNoticeUpsertRequest(
      childId: childId,
      activityDayId: activityDayId,
      alternatePersonUserId: trimmedOrNil(alternatePersonUserId),
      alternatePersonName: trimmedOrNil(alternatePersonName),
      description: description.trimmingCharacters(in: .whitespacesAndNewlines)
    )
  }

  private func trimmedOrNil(_ value: String) -> String? {
    let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
    return trimmed.isEmpty ? nil : trimmed
  }
}

private struct PickupNoticeEditorView: View {
  @Environment(\.dismiss) private var dismiss
  @EnvironmentObject private var sessionStore: SessionStore

  let context: PickupNoticeEditorContext
  let options: MobilePickupNoticeOptionsResponse?
  let onSaved: () -> Void
  let onDeleted: () -> Void

  @State private var draft: PickupNoticeDraft
  @State private var personMode: PickupPersonEntryMode
  @State private var isSaving = false
  @State private var isDeleting = false
  @State private var feedbackMessage: String?
  @State private var feedbackIsError = false

  init(
    context: PickupNoticeEditorContext,
    options: MobilePickupNoticeOptionsResponse?,
    onSaved: @escaping () -> Void,
    onDeleted: @escaping () -> Void
  ) {
    self.context = context
    self.options = options
    self.onSaved = onSaved
    self.onDeleted = onDeleted
    _draft = State(initialValue: PickupNoticeDraft(context: context, options: options))
    _personMode = State(initialValue: {
      if let notice = context.notice,
         notice.alternatePersonUserId == nil,
         notice.alternatePersonName != nil {
        return .name
      }
      return .contact
    }())
  }

  var body: some View {
    Form {
      if context.isEditing, let notice = context.notice {
        Section("Sesión") {
          Text(notice.activityDayLabel)
          Text("Hijo: \(notice.childLabel)")
          Text("Creado por: \(notice.createdByLabel)")
            .foregroundStyle(.secondary)
        }
      } else {
        Section("Sesión") {
          if let options {
            Picker("Hijo", selection: $draft.childId) {
              ForEach(options.children) { child in
                Text(child.label).tag(child.id)
              }
            }
            .pickerStyle(.menu)

            Picker("Actividad", selection: $draft.activityDayId) {
              ForEach(options.activityDays) { day in
                Text(day.label).tag(day.id)
              }
            }
            .pickerStyle(.menu)
          } else {
            Text("Cargando opciones...")
              .foregroundStyle(.secondary)
          }
        }
      }

      Section("Quién retira") {
        Picker("Tipo", selection: $personMode) {
          ForEach(PickupPersonEntryMode.allCases) { mode in
            Text(mode.label).tag(mode)
          }
        }
        .pickerStyle(.segmented)

        if personMode == .contact {
          Picker("Contacto", selection: $draft.alternatePersonUserId) {
            Text("Seleccionar contacto").tag("")
            ForEach(options?.users ?? []) { user in
              Text(user.label).tag(user.id)
            }
          }
          .pickerStyle(.menu)
          .disabled(options?.users.isEmpty ?? true)
        } else {
          TextField("Nombre", text: $draft.alternatePersonName)
            .textInputAutocapitalization(.words)
        }
      }

      Section("Descripción") {
        TextField("Motivo o nota", text: $draft.description, axis: .vertical)
          .lineLimit(2...4)
      }

      if let feedbackMessage {
        Section {
          Text(feedbackMessage)
            .foregroundStyle(feedbackIsError ? .red : .secondary)
        }
      }

      if context.isEditing {
        Section {
          Button(role: .destructive) {
            Task { await deleteNotice() }
          } label: {
            Text(isDeleting ? "Eliminando..." : "Eliminar aviso")
              .frame(maxWidth: .infinity, alignment: .center)
          }
          .disabled(isDeleting || isSaving)
        }
      }

      Section {
        Button {
          Task { await saveNotice() }
        } label: {
          Text(isSaving ? "Guardando..." : (context.isEditing ? "Guardar cambios" : "Crear aviso"))
            .frame(maxWidth: .infinity, alignment: .center)
        }
        .disabled(isSaving || !canSave)
      }
    }
    .navigationTitle(context.navigationTitle)
    .navigationBarTitleDisplayMode(.inline)
    .toolbar {
      ToolbarItem(placement: .cancellationAction) {
        Button("Cerrar") {
          dismiss()
        }
      }
    }
  }

  private var canSave: Bool {
    let description = draft.description.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !description.isEmpty else { return false }

    switch personMode {
    case .contact:
      guard !(draft.alternatePersonUserId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty) else {
        return false
      }
    case .name:
      guard !(draft.alternatePersonName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty) else {
        return false
      }
    }

    if context.isEditing {
      return true
    }

    guard !(draft.childId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty) else {
      return false
    }

    return !(draft.activityDayId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
  }

  private func saveNotice() async {
    guard let token = sessionStore.token else {
      feedbackMessage = "No hay sesión activa."
      feedbackIsError = true
      return
    }

    isSaving = true
    feedbackMessage = nil
    feedbackIsError = false
    defer { isSaving = false }

    let payload = draft.makeRequest()

    do {
      if context.isEditing, let notice = context.notice {
        _ = try await APIClient.shared.updatePickupNotice(
          token: token,
          noticeId: notice.id,
          payload: payload
        )
      } else {
        _ = try await APIClient.shared.createPickupNotice(
          token: token,
          payload: payload
        )
      }

      onSaved()
      dismiss()
    } catch {
      feedbackMessage = error.localizedDescription
      feedbackIsError = true
      print("[pickup notices] save failed", error)
    }
  }

  private func deleteNotice() async {
    guard let token = sessionStore.token, let notice = context.notice else {
      feedbackMessage = "No hay sesión activa."
      feedbackIsError = true
      return
    }

    isDeleting = true
    feedbackMessage = nil
    feedbackIsError = false
    defer { isDeleting = false }

    do {
      try await APIClient.shared.deletePickupNotice(token: token, noticeId: notice.id)
      onDeleted()
      dismiss()
    } catch {
      feedbackMessage = error.localizedDescription
      feedbackIsError = true
      print("[pickup notices] delete failed", error)
    }
  }
}

private extension MobileFamilyRelationship {
  var label: String {
    switch self {
    case .parent:
      return "Madre / Padre"
    case .responsible:
      return "Responsable"
    case .other:
      return "Tutor/a"
    }
  }
}
