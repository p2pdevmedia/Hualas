import Foundation

private struct CacheEnvelope<Value: Codable>: Codable {
  let savedAt: Date
  let value: Value
}

actor MobileActivitiesCacheStore {
  static let shared = MobileActivitiesCacheStore()

  private let cacheLifetime: TimeInterval = 60 * 60 * 12

  private let encoder: JSONEncoder = {
    let encoder = JSONEncoder()
    encoder.dateEncodingStrategy = .iso8601
    return encoder
  }()

  private let decoder: JSONDecoder = {
    let decoder = JSONDecoder()
    decoder.dateDecodingStrategy = .iso8601
    return decoder
  }()

  private let fileManager: FileManager
  private let rootDirectory: URL
  private var memoryCache: [String: Data] = [:]

  init() {
    let fileManager = FileManager.default
    self.fileManager = fileManager
    let cachesDirectory = fileManager.urls(for: .cachesDirectory, in: .userDomainMask)
      .first ?? fileManager.temporaryDirectory
    rootDirectory = cachesDirectory.appendingPathComponent(
      "HualasActivitiesCache",
      isDirectory: true
    )
  }

  func calendarSummary(
    scopeKey: String,
    monthKey: String
  ) -> MobileActivitiesCalendarSummaryResponse? {
    load(scopeKey: scopeKey, fileName: "summary-\(monthKey)")
  }

  func store(
    calendarSummary: MobileActivitiesCalendarSummaryResponse,
    scopeKey: String,
    monthKey: String
  ) {
    save(calendarSummary, scopeKey: scopeKey, fileName: "summary-\(monthKey)")
  }

  func daySessions(
    scopeKey: String,
    monthKey: String,
    dayKey: String
  ) -> MobileActivitiesDaySessionsResponse? {
    load(scopeKey: scopeKey, fileName: "day-\(monthKey)-\(dayKey)")
  }

  func store(
    daySessions: MobileActivitiesDaySessionsResponse,
    scopeKey: String,
    monthKey: String,
    dayKey: String
  ) {
    save(daySessions, scopeKey: scopeKey, fileName: "day-\(monthKey)-\(dayKey)")
  }

  func sessionDetail(
    scopeKey: String,
    dayId: String
  ) -> MobileActivitySessionDetailResponse? {
    load(scopeKey: scopeKey, fileName: "detail-\(dayId)")
  }

  func store(
    sessionDetail: MobileActivitySessionDetailResponse,
    scopeKey: String,
    dayId: String
  ) {
    save(sessionDetail, scopeKey: scopeKey, fileName: "detail-\(dayId)")
  }

  func removeAll(for scopeKey: String) {
    let directory = scopeDirectory(for: scopeKey)
    memoryCache.keys
      .filter { $0.hasPrefix("\(scopeKey)/") }
      .forEach { memoryCache.removeValue(forKey: $0) }
    try? fileManager.removeItem(at: directory)
  }

  private func load<Value: Codable>(
    scopeKey: String,
    fileName: String
  ) -> Value? {
    let cacheKey = cacheKey(scopeKey: scopeKey, fileName: fileName)
    let url = cacheURL(scopeKey: scopeKey, fileName: fileName)

    if let data = memoryCache[cacheKey],
       let value = decode(Value.self, from: data, at: url) {
      return value
    }

    guard let data = try? Data(contentsOf: url) else {
      memoryCache.removeValue(forKey: cacheKey)
      return nil
    }

    memoryCache[cacheKey] = data
    let value = decode(Value.self, from: data, at: url)
    if value == nil {
      memoryCache.removeValue(forKey: cacheKey)
    }
    return value
  }

  private func save<Value: Codable>(
    _ value: Value,
    scopeKey: String,
    fileName: String
  ) {
    let cacheKey = cacheKey(scopeKey: scopeKey, fileName: fileName)
    let url = cacheURL(scopeKey: scopeKey, fileName: fileName)

    do {
      try ensureDirectoryExists(at: url.deletingLastPathComponent())
      let envelope = CacheEnvelope(savedAt: Date(), value: value)
      let data = try encoder.encode(envelope)
      try data.write(to: url, options: [.atomic])
      memoryCache[cacheKey] = data
    } catch {
      print("[activities-cache] save failed", error)
    }
  }

  private func decode<Value: Codable>(
    _ type: Value.Type,
    from data: Data,
    at url: URL
  ) -> Value? {
    do {
      let envelope = try decoder.decode(CacheEnvelope<Value>.self, from: data)
      if Date().timeIntervalSince(envelope.savedAt) > cacheLifetime {
        try? fileManager.removeItem(at: url)
        return nil
      }
      return envelope.value
    } catch {
      try? fileManager.removeItem(at: url)
      print("[activities-cache] decode failed", error)
      return nil
    }
  }

  private func ensureDirectoryExists(at url: URL) throws {
    try fileManager.createDirectory(
      at: url,
      withIntermediateDirectories: true,
      attributes: nil
    )
  }

  private func scopeDirectory(for scopeKey: String) -> URL {
    rootDirectory.appendingPathComponent(scopeKey, isDirectory: true)
  }

  private func cacheURL(scopeKey: String, fileName: String) -> URL {
    scopeDirectory(for: scopeKey)
      .appendingPathComponent(fileName)
      .appendingPathExtension("json")
  }

  private func cacheKey(scopeKey: String, fileName: String) -> String {
    "\(scopeKey)/\(fileName)"
  }
}
