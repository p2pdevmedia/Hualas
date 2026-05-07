import SwiftUI

struct ChildrenView: View {
  @EnvironmentObject private var sessionStore: SessionStore
  @State private var children: [MobileChildrenResponse.Child] = []
  @State private var isLoading = false
  @State private var errorMessage: String?
  @State private var editorContext: ChildEditorContext?

  var body: some View {
    NavigationStack {
      List {
        if children.isEmpty && !isLoading {
          emptyState
        } else {
          ForEach(children) { child in
            NavigationLink {
              ChildDetailView(childId: child.id, child: child) { updatedChild in
                updateChild(updatedChild)
              }
            } label: {
              childRow(child)
            }
          }
        }
      }
      .navigationTitle("Mis hijos")
      .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          Button {
            editorContext = ChildEditorContext(mode: .create)
          } label: {
            Label("Agregar hijo", systemImage: "plus")
          }
        }
      }
      .sheet(item: $editorContext) { context in
        NavigationStack {
          ChildFormView(mode: context.mode) { savedChild in
            updateChild(savedChild)
          }
        }
      }
      .overlay {
        if isLoading && children.isEmpty {
          ProgressView("Cargando hijos...")
        }
      }
      .safeAreaInset(edge: .top) {
        if let errorMessage {
          Text(errorMessage)
            .font(.footnote)
            .foregroundStyle(.red)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal)
            .padding(.top, 4)
        }
      }
      .task { await load() }
      .refreshable { await load() }
    }
  }

  private var emptyState: some View {
    VStack(alignment: .leading, spacing: 8) {
      Text("Todavía no cargaste hijos")
        .font(.headline)
      Text("Usá el botón + para agregar el primero.")
        .font(.footnote)
        .foregroundStyle(.secondary)
    }
    .padding(.vertical, 8)
    .listRowBackground(Color.clear)
  }

  private func childRow(_ child: MobileChildrenResponse.Child) -> some View {
    HStack(spacing: 12) {
      AuthenticatedAvatarView(
        path: "/api/mobile/children/\(child.id)/photo",
        initials: child.initials,
        diameter: 46,
        reloadKey: child.profilePhoto ?? ""
      )

      VStack(alignment: .leading, spacing: 4) {
        Text(child.fullName.isEmpty ? "Sin nombre" : child.fullName)
          .font(.headline)

        if let birthDate = formattedBirthDate(child.birthDate) {
          Text("Nacimiento: \(birthDate)")
            .font(.footnote)
            .foregroundStyle(.secondary)
        }

        if let address = child.address, !address.isEmpty {
          Text(address)
            .font(.footnote)
            .foregroundStyle(.secondary)
            .lineLimit(2)
        }
      }
    }
    .padding(.vertical, 4)
  }

  private func load() async {
    guard let token = sessionStore.token else { return }

    isLoading = true
    errorMessage = nil
    defer { isLoading = false }

    do {
      let response = try await APIClient.shared.children(token: token)
      children = response.children
    } catch {
      guard !error.isCancellationError else { return }
      errorMessage = error.localizedDescription
      print("[children] load failed", error)
    }
  }

  private func updateChild(_ updatedChild: MobileChildrenResponse.Child) {
    if let index = children.firstIndex(where: { $0.id == updatedChild.id }) {
      children[index] = updatedChild
    } else {
      children.append(updatedChild)
    }
  }

  private func formattedBirthDate(_ value: String?) -> String? {
    guard let value, !value.isEmpty,
          let date = Self.birthDateFormatter.date(from: value) else {
      return nil
    }

    return Self.displayBirthDateFormatter.string(from: date)
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

private struct ChildEditorContext: Identifiable {
  let id = UUID()
  let mode: ChildFormMode
}
