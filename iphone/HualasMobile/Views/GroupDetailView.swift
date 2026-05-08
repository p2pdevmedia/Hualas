import SwiftUI

struct GroupDetailView: View {
  @EnvironmentObject private var sessionStore: SessionStore
  @Environment(\.openURL) private var openURL

  let group: MobileGroupsResponse.Group

  @State private var detail: MobileProfessorGroupDetailResponse?
  @State private var isLoading = false
  @State private var errorMessage: String?
  @State private var selectedChatTarget: ChatTarget?

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 16) {
        header

        if isLoading && detail == nil {
          ProgressView("Cargando grupo...")
            .frame(maxWidth: .infinity, alignment: .center)
            .padding(.vertical, 24)
        } else if let detail {
          groupInfoCard(detail.group)
          participantsCard(detail.members)
        }

        if let errorMessage {
          Text(errorMessage)
            .font(.footnote)
            .foregroundStyle(.red)
        }
      }
      .padding()
    }
    .navigationTitle(group.name)
    .navigationBarTitleDisplayMode(.inline)
    .task {
      await load()
    }
    .refreshable {
      await load()
    }
    .sheet(item: $selectedChatTarget) { target in
      ConversationView(
        userId: target.userId,
        title: target.title,
        subtitle: target.subtitle
      )
    }
  }

  private var header: some View {
    VStack(alignment: .leading, spacing: 6) {
      Text(group.name)
        .font(.title2.bold())
      Text(group.activity.name)
        .font(.subheadline)
        .foregroundStyle(.secondary)
      Text("\(group.memberCount) integrantes")
        .font(.footnote.weight(.semibold))
        .foregroundStyle(.secondary)
    }
  }

  private func groupInfoCard(_ group: MobileProfessorGroupDetailResponse.Group) -> some View {
    infoCard {
      VStack(alignment: .leading, spacing: 8) {
        Text("Grupo").font(.headline)
        Text(group.description ?? "Sin descripcion")
          .foregroundStyle(.secondary)
        Text("Actividad: \(group.activity.name)")
        Text("Capacidad: \(group.capacity.map(String.init) ?? "Sin limite")")
        Text("Rango de edad: \(group.minAge.map(String.init) ?? "N/A") - \(group.maxAge.map(String.init) ?? "N/A")")
      }
    }
  }

  private func participantsCard(_ members: [MobileProfessorGroupDetailResponse.Member]) -> some View {
    infoCard {
      VStack(alignment: .leading, spacing: 12) {
        HStack {
          Text("Participantes")
            .font(.headline)
          Spacer()
          Text("\(members.count)")
            .font(.footnote.weight(.semibold))
            .foregroundStyle(.secondary)
        }

        ForEach(members) { member in
          VStack(alignment: .leading, spacing: 10) {
            VStack(alignment: .leading, spacing: 3) {
              Text(member.label)
                .font(.headline)
              if let childLabel = member.childLabel {
                Text("Alumno: \(childLabel)")
                  .font(.footnote)
                  .foregroundStyle(.secondary)
              }
              Text(member.contact.name)
                .font(.footnote.weight(.semibold))
              if let email = member.contact.email {
                Text(email)
                  .font(.footnote)
                  .foregroundStyle(.secondary)
              }
              if let phone = member.contact.phone, !phone.isEmpty {
                Text(phone)
                  .font(.footnote)
                  .foregroundStyle(.secondary)
              }
            }

            HStack(spacing: 12) {
              Button {
                call(phone: member.contact.phone)
              } label: {
                Label("Llamar", systemImage: "phone.fill")
                  .frame(maxWidth: .infinity)
              }
              .buttonStyle(.bordered)
              .disabled(!hasDialablePhone(member.contact.phone))

              Button {
                selectedChatTarget = ChatTarget(
                  userId: member.userId,
                  title: member.contact.name,
                  subtitle: member.contact.email ?? member.contact.phone
                )
              } label: {
                Label("Mensaje", systemImage: "bubble.left.and.bubble.right.fill")
                  .frame(maxWidth: .infinity)
              }
              .buttonStyle(.borderedProminent)
            }
          }
          .frame(maxWidth: .infinity, alignment: .leading)
          .padding()
          .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 16))
        }
      }
    }
  }

  private func load() async {
    guard let token = sessionStore.token else { return }

    isLoading = true
    errorMessage = nil
    defer { isLoading = false }

    do {
      detail = try await APIClient.shared.professorGroupDetail(token: token, groupId: group.id)
    } catch {
      guard !error.isCancellationError else { return }
      errorMessage = error.localizedDescription
      print("[groups] detail load failed", error)
    }
  }

  private func infoCard<Content: View>(@ViewBuilder content: () -> Content) -> some View {
    content()
      .frame(maxWidth: .infinity, alignment: .leading)
      .padding()
      .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 18))
  }

  private func hasDialablePhone(_ phone: String?) -> Bool {
    sanitizedPhone(phone)?.isEmpty == false
  }

  private func call(phone: String?) {
    guard let phone = sanitizedPhone(phone),
          let url = URL(string: "tel://\(phone)") else {
      return
    }
    openURL(url)
  }

  private func sanitizedPhone(_ phone: String?) -> String? {
    let digits = phone?.filter { $0.isNumber }
    return digits?.isEmpty == true ? nil : digits
  }
}

private struct ChatTarget: Identifiable {
  let userId: String
  let title: String
  let subtitle: String?

  var id: String { userId }
}

private enum ChatPresentation: Identifiable {
  case newChat
  case conversation(ChatTarget)

  var id: String {
    switch self {
    case .newChat:
      return "new-chat"
    case .conversation(let target):
      return "conversation-\(target.id)"
    }
  }
}

struct GlobalChatView: View {
  @EnvironmentObject private var sessionStore: SessionStore
  @State private var conversations: [MobileConversationListResponse.Conversation] = []
  @State private var isLoading = false
  @State private var errorMessage: String?
  @State private var presentedSheet: ChatPresentation?

  var body: some View {
    NavigationStack {
      List {
        if isLoading && conversations.isEmpty {
          ProgressView("Cargando chats...")
        }

        ForEach(conversations) { conversation in
          if let peer = conversation.peer {
            Button {
              presentedSheet = .conversation(ChatTarget(
                userId: peer.id,
                title: conversation.title,
                subtitle: conversation.subtitle
              ))
            } label: {
              chatRow(conversation: conversation)
            }
            .buttonStyle(.plain)
          } else {
            chatRow(conversation: conversation)
          }
        }

        if conversations.isEmpty && !isLoading {
          Text("Todavia no hay chats abiertos.")
            .foregroundStyle(.secondary)
        }
      }
      .navigationTitle("Chat")
      .toolbar(.hidden, for: .navigationBar)
      .safeAreaInset(edge: .top, spacing: 0) {
        if sessionStore.currentRole == .member {
          HStack {
            Text("Chat")
              .font(.title3.bold())
            Spacer()
            Button {
              presentedSheet = .newChat
            } label: {
              Image(systemName: "plus")
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(.white)
                .frame(width: 38, height: 38)
                .background(
                  RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(Color.accentColor)
                )
                .overlay(
                  RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(Color.white.opacity(0.08), lineWidth: 1)
                )
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Nuevo chat")
          }
          .padding(.horizontal, 16)
          .padding(.top, 4)
          .padding(.bottom, 10)
          .background(.thinMaterial)
        }
      }
      .sheet(item: $presentedSheet) { sheet in
        switch sheet {
        case .newChat:
          NavigationStack {
            NewChatPickerView()
          }
        case .conversation(let target):
          ConversationView(
            userId: target.userId,
            title: target.title,
            subtitle: target.subtitle
          )
        }
      }
      .task {
        await load()
      }
      .refreshable {
        await load()
      }
      .overlay(alignment: .bottom) {
        if let errorMessage {
          Text(errorMessage)
            .font(.footnote)
            .foregroundStyle(.red)
            .padding(.bottom, 8)
        }
      }
    }
  }

  private func chatRow(conversation: MobileConversationListResponse.Conversation) -> some View {
    VStack(alignment: .leading, spacing: 4) {
      HStack {
        Text(conversation.title)
          .font(.headline)
        Spacer()
        if conversation.unreadCount > 0 {
          Text("\(conversation.unreadCount)")
            .font(.caption.weight(.bold))
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(.red.opacity(0.18), in: Capsule())
        }
      }
      Text(conversation.subtitle ?? "Sin detalle")
        .font(.footnote)
        .foregroundStyle(.secondary)
      if let lastMessage = conversation.lastMessage {
        Text(lastMessage.content)
          .lineLimit(2)
          .font(.subheadline)
      }
    }
    .padding(.vertical, 6)
  }

  private func load() async {
    guard let token = sessionStore.token else { return }

    isLoading = true
    errorMessage = nil
    defer { isLoading = false }

    do {
      conversations = try await APIClient.shared.conversations(token: token).conversations
    } catch {
      guard !error.isCancellationError else { return }
      errorMessage = error.localizedDescription
      print("[chat] load failed", error)
    }
  }
}

struct ConversationView: View {
  @EnvironmentObject private var sessionStore: SessionStore

  let userId: String
  let title: String
  let subtitle: String?

  @State private var thread: MobileConversationThreadResponse?
  @State private var messageText = ""
  @State private var isLoading = false
  @State private var isSending = false
  @State private var errorMessage: String?

  var body: some View {
    VStack(spacing: 0) {
      ScrollViewReader { proxy in
        ScrollView {
          LazyVStack(spacing: 12) {
            ForEach(thread?.messages ?? []) { message in
              messageBubble(message)
                .id(message.id)
            }
          }
          .padding()
        }
        .onChange(of: thread?.messages.count ?? 0) { _ in
          scrollToBottom(proxy: proxy)
        }
        .task(id: userId) {
          await loadThread()
          scrollToBottom(proxy: proxy)
        }
        .refreshable {
          await loadThread()
        }
      }

      composer
    }
    .navigationTitle(title)
    .navigationBarTitleDisplayMode(.inline)
  }

  private var composer: some View {
    VStack(alignment: .leading, spacing: 8) {
      if let subtitle {
        Text(subtitle)
          .font(.footnote)
          .foregroundStyle(.secondary)
      }
      HStack(alignment: .bottom, spacing: 8) {
        TextField("Escribí un mensaje", text: $messageText, axis: .vertical)
          .textFieldStyle(.roundedBorder)
          .lineLimit(1...4)
        Button {
          Task { await sendMessage() }
        } label: {
          if isSending {
            ProgressView()
              .padding(.horizontal, 8)
          } else {
            Image(systemName: "paperplane.fill")
              .font(.headline)
              .padding(10)
          }
        }
        .buttonStyle(.borderedProminent)
        .disabled(messageText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isSending)
      }
      .padding()
      if let errorMessage {
        Text(errorMessage)
          .font(.footnote)
          .foregroundStyle(.red)
          .padding(.horizontal)
      }
    }
    .background(.regularMaterial)
  }

  private func messageBubble(_ message: MobileConversationThreadResponse.Message) -> some View {
    let isMine = message.from == sessionStore.me?.user.id

    return HStack {
      if isMine { Spacer(minLength: 40) }
      VStack(alignment: .leading, spacing: 4) {
        Text(message.content)
          .foregroundStyle(isMine ? .white : .primary)
        Text(formattedTime(message.createdAt))
          .font(.caption2)
          .foregroundStyle(isMine ? .white.opacity(0.75) : .secondary)
      }
      .padding(.vertical, 10)
      .padding(.horizontal, 12)
      .background(isMine ? Color.accentColor : Color.secondary.opacity(0.1), in: RoundedRectangle(cornerRadius: 16))
      if !isMine { Spacer(minLength: 40) }
    }
  }

  private func loadThread() async {
    guard let token = sessionStore.token else { return }

    isLoading = true
    errorMessage = nil
    defer { isLoading = false }

    do {
      thread = try await APIClient.shared.conversationThread(token: token, userId: userId)
    } catch {
      guard !error.isCancellationError else { return }
      errorMessage = error.localizedDescription
      print("[chat] thread load failed", error)
    }
  }

  private func sendMessage() async {
    guard let token = sessionStore.token else { return }
    let trimmed = messageText.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty else { return }

    isSending = true
    errorMessage = nil
    defer { isSending = false }

    do {
      let saved = try await APIClient.shared.sendMessage(
        token: token,
        userId: userId,
        content: trimmed
      )
      messageText = ""
      if thread == nil {
        thread = MobileConversationThreadResponse(conversationId: nil, peer: nil, messages: [])
      }
      if var currentThread = thread {
        currentThread.messages.append(saved)
        thread = currentThread
      }
    } catch {
      guard !error.isCancellationError else { return }
      errorMessage = error.localizedDescription
      print("[chat] send failed", error)
    }
  }

  private func scrollToBottom(proxy: ScrollViewProxy) {
    guard let lastId = thread?.messages.last?.id else { return }
    proxy.scrollTo(lastId, anchor: .bottom)
  }

  private func formattedTime(_ iso: String) -> String {
    let date = ISO8601DateFormatter().date(from: iso) ?? Date()
    return date.formatted(date: .omitted, time: .shortened)
  }
}
