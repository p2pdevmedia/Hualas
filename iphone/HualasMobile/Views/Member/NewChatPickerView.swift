import SwiftUI

struct NewChatPickerView: View {
  @EnvironmentObject private var sessionStore: SessionStore

  @State private var contacts: MobileChatContactsResponse?
  @State private var isLoading = false
  @State private var errorMessage: String?
  @State private var searchText = ""

  var body: some View {
    List {
      if isLoading && contacts == nil {
        ProgressView("Cargando contactos...")
      }

      if !filteredFamilyContacts.isEmpty {
        Section("Tutores") {
          ForEach(filteredFamilyContacts) { contact in
            contactLink(contact)
          }
        }
      }

      if !filteredProfessorContacts.isEmpty {
        Section("Profesores") {
          ForEach(filteredProfessorContacts) { contact in
            contactLink(contact)
          }
        }
      }

      if !filteredStaffContacts.isEmpty {
        Section("Administración y contaduría") {
          ForEach(filteredStaffContacts) { contact in
            contactLink(contact)
          }
        }
      }

      if contacts != nil && filteredFamilyContacts.isEmpty && filteredProfessorContacts.isEmpty && filteredStaffContacts.isEmpty {
        Text("No encontramos contactos para ese filtro.")
          .foregroundStyle(.secondary)
      }

      if let errorMessage {
        Text(errorMessage)
          .font(.footnote)
          .foregroundStyle(.red)
      }
    }
    .navigationTitle("Nuevo chat")
    .navigationBarTitleDisplayMode(.inline)
    .searchable(text: $searchText, prompt: "Buscar contacto")
    .task {
      await load()
    }
    .refreshable {
      await load()
    }
  }
}

private extension NewChatPickerView {
  var filteredFamilyContacts: [MobileChatContactsResponse.Contact] {
    filterContacts(contacts?.familyContacts ?? [])
  }

  var filteredProfessorContacts: [MobileChatContactsResponse.Contact] {
    filterContacts(contacts?.professorContacts ?? [])
  }

  var filteredStaffContacts: [MobileChatContactsResponse.Contact] {
    filterContacts(contacts?.staffContacts ?? [])
  }

  func filterContacts(
    _ items: [MobileChatContactsResponse.Contact]
  ) -> [MobileChatContactsResponse.Contact] {
    let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !query.isEmpty else { return items }

    let lowercasedQuery = query.lowercased()
    return items.filter { contact in
      contact.label.lowercased().contains(lowercasedQuery) ||
        contact.subtitle.lowercased().contains(lowercasedQuery) ||
        (contact.detailLine?.lowercased().contains(lowercasedQuery) ?? false) ||
        contact.activityNames.joined(separator: " ").lowercased().contains(lowercasedQuery)
    }
  }

  func contactLink(
    _ contact: MobileChatContactsResponse.Contact
  ) -> some View {
    NavigationLink {
      ConversationView(
        userId: contact.userId,
        title: contact.label,
        subtitle: contact.subtitle
      )
    } label: {
      HStack(spacing: 12) {
        AuthenticatedAvatarView(
          path: "/api/users/\(contact.userId)/photo",
          initials: initials(for: contact.label),
          diameter: 44,
          reloadKey: contact.updatedAt
        )

        VStack(alignment: .leading, spacing: 4) {
          Text(contact.label)
            .font(.headline)

          Text(contact.detailLine ?? contact.subtitle)
            .font(.footnote)
            .foregroundStyle(.secondary)
            .lineLimit(1)
            .truncationMode(.tail)
        }

        Spacer(minLength: 8)

        Image(systemName: "chevron.right")
          .font(.footnote.weight(.semibold))
          .foregroundStyle(.secondary)
      }
      .padding(.vertical, 4)
    }
    .buttonStyle(.plain)
  }

  func initials(for name: String) -> String {
    let parts = name
      .split(separator: " ")
      .map(String.init)
      .filter { !$0.isEmpty }

    switch parts.count {
    case 0:
      return "?"
    case 1:
      return String(parts[0].prefix(2)).uppercased()
    default:
      return String(parts[0].prefix(1) + parts[1].prefix(1)).uppercased()
    }
  }

  func load() async {
    guard let token = sessionStore.token else { return }

    isLoading = true
    errorMessage = nil
    defer { isLoading = false }

    do {
      contacts = try await APIClient.shared.memberChatContacts(token: token)
    } catch {
      guard !error.isCancellationError else { return }
      errorMessage = error.localizedDescription
      print("[chat] contacts load failed", error)
    }
  }
}
