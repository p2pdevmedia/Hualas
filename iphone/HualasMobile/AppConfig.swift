import Foundation

enum AppConfig {
  static var apiBaseURL: URL {
    if let raw = Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String,
       let url = URL(string: raw) {
      return url
    }
    return URL(string: "http://localhost:3000")!
  }
}

