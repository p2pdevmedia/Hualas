import SwiftUI

struct PaymentsView: View {
  @EnvironmentObject private var sessionStore: SessionStore
  @State private var payments: [MobilePaymentsResponse.Payment] = []
  @State private var profile: MobilePaymentsResponse.Profile?
  @State private var role: MobileRole = .member

  var body: some View {
    NavigationStack {
      List {
        if let profile {
          Section("Datos bancarios") {
            Text("Sueldo: $\(profile.monthlySalary)")
            if let bankName = profile.bankName { Text(bankName) }
            if let alias = profile.alias { Text("Alias: \(alias)") }
            if let cbu = profile.cbu { Text("CBU: \(cbu)") }
          }
        }

        Section("Pagos") {
          ForEach(payments) { payment in
            VStack(alignment: .leading, spacing: 4) {
              Text(payment.title).font(.headline)
              if let subtitle = payment.subtitle {
                Text(subtitle).font(.footnote).foregroundStyle(.secondary)
              }
              Text(payment.amountLabel).font(.subheadline.bold())
            }
          }
        }
      }
      .navigationTitle("Pagos")
      .task { await load() }
      .refreshable { await load() }
    }
  }

  private func load() async {
    guard let token = sessionStore.token else { return }
    do {
      let response = try await APIClient.shared.payments(token: token)
      payments = response.payments
      profile = response.profile
      role = response.role
    } catch {
      print("[payments] load failed", error)
    }
  }
}

