import Foundation

struct AnyEncodable: Encodable {
  private let encodeImpl: (Encoder) throws -> Void

  init<T: Encodable>(_ value: T) {
    self.encodeImpl = value.encode
  }

  func encode(to encoder: Encoder) throws {
    try encodeImpl(encoder)
  }
}

final class APIClient {
  static let shared = APIClient()

  private let baseURL = AppConfig.apiBaseURL
  private let decoder = JSONDecoder()

  func login(_ request: MobileLoginRequest) async throws -> MobileLoginResponse {
    try await send(
      path: "/api/mobile/auth/login",
      method: "POST",
      body: request
    )
  }

  func me(token: String) async throws -> MobileMeResponse {
    try await send(path: "/api/mobile/me", token: token)
  }

  func home(token: String) async throws -> MobileHomeResponse {
    try await send(path: "/api/mobile/home", token: token)
  }

  func children(token: String) async throws -> MobileChildrenResponse {
    try await send(path: "/api/mobile/children", token: token)
  }

  func activities(token: String) async throws -> MobileActivitiesResponse {
    try await send(path: "/api/mobile/activities", token: token)
  }

  func payments(token: String) async throws -> MobilePaymentsResponse {
    try await send(path: "/api/mobile/payments", token: token)
  }

  func news(token: String) async throws -> MobileNewsResponse {
    try await send(path: "/api/mobile/news", token: token)
  }

  func registerDevice(token: String, payload: MobileDeviceRegistration) async throws {
    _ = try await send(
      path: "/api/mobile/devices",
      method: "POST",
      token: token,
      body: payload
    ) as MobileDeviceRegistrationResponse
  }

  func professorGroups(token: String) async throws -> MobileGroupsResponse {
    try await send(path: "/api/mobile/professor/groups", token: token)
  }

  func professorStudents(
    token: String,
    groupId: String? = nil
  ) async throws -> MobileStudentsResponse {
    let path = groupId.map { "/api/mobile/professor/students?groupId=\($0)" }
      ?? "/api/mobile/professor/students"
    return try await send(path: path, token: token)
  }

  func professorAttendance(token: String) async throws -> MobileAttendanceListResponse {
    try await send(path: "/api/mobile/professor/attendance", token: token)
  }

  func professorAttendanceDetail(
    token: String,
    dayId: String
  ) async throws -> MobileAttendanceDetailResponse {
    try await send(path: "/api/mobile/professor/attendance/\(dayId)", token: token)
  }

  func updateAttendance(
    token: String,
    dayId: String,
    participantId: String,
    status: String
  ) async throws -> MobileAttendanceUpdateResponse {
    try await send(
      path: "/api/mobile/professor/attendance/\(dayId)",
      method: "PATCH",
      token: token,
      body: MobileAttendanceUpdateRequest(participantId: participantId, status: status)
    )
  }

  func logout(token: String) async throws {
    let _: EmptyResponse = try await send(
      path: "/api/mobile/auth/logout",
      method: "POST",
      token: token,
      body: EmptyRequest()
    )
  }

  private func send<T: Decodable>(
    path: String,
    method: String = "GET",
    token: String? = nil,
    body: Encodable? = nil
  ) async throws -> T {
    let url = URL(string: path, relativeTo: baseURL)?.absoluteURL ?? baseURL
    var request = URLRequest(url: url)
    request.httpMethod = method
    request.setValue("application/json", forHTTPHeaderField: "Accept")
    if let token {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }

    if let body {
      request.setValue("application/json", forHTTPHeaderField: "Content-Type")
      request.httpBody = try JSONEncoder().encode(AnyEncodable(body))
    }

    let (data, response) = try await URLSession.shared.data(for: request)
    guard let http = response as? HTTPURLResponse else {
      throw APIError.invalidResponse
    }
    guard 200..<300 ~= http.statusCode else {
      let message = String(data: data, encoding: .utf8) ?? "HTTP \(http.statusCode)"
      throw APIError.server(statusCode: http.statusCode, message: message)
    }
    return try decoder.decode(T.self, from: data)
  }
}

enum APIError: Error, LocalizedError {
  case invalidResponse
  case server(statusCode: Int, message: String)

  var errorDescription: String? {
    switch self {
    case .invalidResponse:
      return "Invalid server response"
    case .server(let code, let message):
      return "\(code): \(message)"
    }
  }
}

struct MobileDeviceRegistration: Codable {
  let token: String
  let platform: String
  let bundleId: String?
  let environment: String?
  let deviceName: String?
  let deviceModel: String?
  let appVersion: String?
}

struct MobileDeviceRegistrationResponse: Codable {
  struct Device: Codable {
    let id: String
    let token: String
  }

  let device: Device
}

struct MobileAttendanceUpdateRequest: Codable {
  let participantId: String
  let status: String
}

struct EmptyRequest: Codable {}

struct EmptyResponse: Codable {}
