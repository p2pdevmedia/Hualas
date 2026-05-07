import SwiftUI

struct StudentsView: View {
  @EnvironmentObject private var sessionStore: SessionStore
  @State private var students: [MobileStudentsResponse.Student] = []

  var body: some View {
    NavigationStack {
      List(students) { student in
        VStack(alignment: .leading, spacing: 4) {
          Text(student.label).font(.headline)
          Text(student.activity.name).font(.footnote).foregroundStyle(.secondary)
          if let groupName = student.groupName {
            Text(groupName).font(.footnote)
          }
        }
      }
      .navigationTitle("Alumnos")
      .task { await load() }
      .refreshable { await load() }
    }
  }

  private func load() async {
    guard let token = sessionStore.token else { return }
    do {
      let response = try await APIClient.shared.professorStudents(token: token)
      students = response.students
    } catch {
      print("[students] load failed", error)
    }
  }
}

