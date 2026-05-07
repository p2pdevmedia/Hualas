import SwiftUI

struct NewsView: View {
  @EnvironmentObject private var sessionStore: SessionStore
  @State private var news: [MobileNewsResponse.NewsItem] = []

  var body: some View {
    NavigationStack {
      List(news) { item in
        VStack(alignment: .leading, spacing: 6) {
          Text(item.title).font(.headline)
          if let activityName = item.activityName {
            Text(activityName).font(.footnote).foregroundStyle(.secondary)
          }
          Text(item.body)
            .font(.subheadline)
        }
        .padding(.vertical, 4)
      }
      .navigationTitle("Noticias")
      .toolbar(.hidden, for: .navigationBar)
      .task { await load() }
      .refreshable { await load() }
    }
  }

  private func load() async {
    guard let token = sessionStore.token else { return }
    do {
      let response = try await APIClient.shared.news(token: token)
      news = response.news
    } catch {
      guard !error.isCancellationError else { return }
      print("[news] load failed", error)
    }
  }
}
