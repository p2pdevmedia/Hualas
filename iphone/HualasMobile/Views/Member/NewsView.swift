import SwiftUI

struct NewsView: View {
  @EnvironmentObject private var sessionStore: SessionStore
  @State private var news: [MobileNewsResponse.NewsItem] = []
  @State private var isLoading = false
  @State private var errorMessage: String?
  @State private var pendingReadIds = Set<String>()
  @State private var queuedReadIds = Set<String>()
  @State private var readFlushTask: Task<Void, Never>?

  var body: some View {
    List {
      if isLoading && news.isEmpty {
        ProgressView("Cargando noticias…")
      }

      if let errorMessage {
        Text(errorMessage)
          .font(.footnote)
          .foregroundStyle(.red)
      }

      ForEach($news) { $item in
        VStack(alignment: .leading, spacing: 6) {
          HStack(spacing: 8) {
            Text(item.title).font(.headline)
            if !item.isRead {
              Text("No leído")
                .font(.caption2.weight(.semibold))
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color.orange.opacity(0.18), in: Capsule())
                .foregroundStyle(.orange)
            }
          }

          if let activityName = item.activityName {
            Text(activityName).font(.footnote).foregroundStyle(.secondary)
          }
          Text(item.body)
            .font(.subheadline)
        }
        .padding(.vertical, 4)
        .onAppear { markReadIfNeeded(id: item.id) }
      }
    }
    .navigationTitle("Noticias")
    .navigationBarTitleDisplayMode(.inline)
    .task { await load() }
    .refreshable { await load() }
  }

  private func load() async {
    guard let token = sessionStore.token else { return }
    isLoading = true
    errorMessage = nil

    do {
      let response = try await APIClient.shared.news(token: token)
      news = response.news
    } catch {
      guard !error.isCancellationError else { return }
      errorMessage = "No pudimos cargar las noticias. Intentá de nuevo."
      print("[news] load failed", error)
    }

    isLoading = false
  }

  private func markReadIfNeeded(id: String) {
    guard news.contains(where: { $0.id == id && !$0.isRead }) else { return }
    guard !pendingReadIds.contains(id), !queuedReadIds.contains(id) else { return }

    queuedReadIds.insert(id)
    readFlushTask?.cancel()
    readFlushTask = Task {
      try? await Task.sleep(nanoseconds: 350_000_000)
      guard !Task.isCancelled else { return }
      await MainActor.run { flushReadQueue() }
    }
  }

  private func flushReadQueue() {
    guard let token = sessionStore.token else { return }
    let ids = Array(queuedReadIds).filter { id in
      news.contains(where: { $0.id == id && !$0.isRead })
    }
    queuedReadIds.removeAll()

    guard !ids.isEmpty else { return }

    ids.forEach { pendingReadIds.insert($0) }

    Task {
      do {
        try await APIClient.shared.markNewsRead(token: token, newsIds: ids)
        await MainActor.run {
          for id in ids {
            if let currentIndex = news.firstIndex(where: { $0.id == id }) {
              news[currentIndex].isRead = true
            }
            pendingReadIds.remove(id)
          }
        }
      } catch {
        await MainActor.run {
          ids.forEach { pendingReadIds.remove($0) }
          errorMessage = "No pudimos actualizar el estado de lectura."
        }
        print("[news] mark read failed", error)
      }
    }
  }
}
