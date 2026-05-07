import SwiftUI

struct ProfileView: View {
  @EnvironmentObject private var sessionStore: SessionStore
  @State private var professorProfile: MobilePaymentsResponse.Profile?
  @State private var isLoading = false

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(alignment: .leading, spacing: 16) {
          header

          if sessionStore.allowedRoles.count > 1 {
            roleSwitcher
          }

          if sessionStore.currentRole == .professor {
            professorSection
          } else {
            memberSection
          }

          Button(role: .destructive) {
            Task { await sessionStore.logout() }
          } label: {
            Text("Cerrar sesión")
              .frame(maxWidth: .infinity)
              .padding()
              .background(.red.opacity(0.12), in: RoundedRectangle(cornerRadius: 14))
          }
        }
        .padding()
      }
      .navigationTitle("Perfil")
      .task { await loadProfessorProfileIfNeeded() }
      .refreshable { await loadProfessorProfileIfNeeded() }
    }
  }

  private var header: some View {
    VStack(alignment: .leading, spacing: 4) {
      Text(sessionStore.me?.user.name ?? "Usuario")
        .font(.largeTitle.bold())
      Text(sessionStore.me?.user.email ?? "")
        .foregroundStyle(.secondary)
      Text("Perfil activo: \(sessionStore.currentRole?.rawValue ?? "MEMBER")")
        .font(.footnote.weight(.semibold))
        .foregroundStyle(.secondary)
    }
  }

  private var roleSwitcher: some View {
    VStack(alignment: .leading, spacing: 8) {
      Text("Cambiar perfil").font(.headline)
      Picker("Perfil", selection: Binding(
        get: { sessionStore.currentRole ?? .member },
        set: { newRole in
          Task { await sessionStore.switchRole(to: newRole) }
        }
      )) {
        ForEach(sessionStore.allowedRoles, id: \.self) { role in
          Text(label(for: role)).tag(role)
        }
      }
      .pickerStyle(.segmented)
    }
  }

  private var memberSection: some View {
    VStack(alignment: .leading, spacing: 12) {
      Text("Datos de la cuenta").font(.headline)
      infoCard {
        Text("Roles disponibles: \(sessionStore.allowedRoles.map { label(for: $0) }.joined(separator: ", "))")
        Text("Si tenés perfil de profesor, podés cambiarlo desde acá.")
          .font(.footnote)
          .foregroundStyle(.secondary)
      }
    }
  }

  private var professorSection: some View {
    VStack(alignment: .leading, spacing: 12) {
      Text("Perfil de profesor").font(.headline)
      if isLoading && professorProfile == nil {
        ProgressView("Cargando perfil...")
      } else if let professorProfile {
        infoCard {
          Text("Sueldo mensual: \(currency(professorProfile.monthlySalary))")
          Text("Banco: \(professorProfile.bankName ?? "Sin dato")")
          Text("CBU: \(professorProfile.cbu ?? "Sin dato")")
          Text("Alias: \(professorProfile.alias ?? "Sin dato")")
          Text("CUIT: \(professorProfile.cuit ?? "Sin dato")")
          if let notes = professorProfile.notes, !notes.isEmpty {
            Text(notes)
              .font(.footnote)
              .foregroundStyle(.secondary)
          }
        }
      } else {
        infoCard {
          Text("No hay datos de perfil cargados todavía.")
            .foregroundStyle(.secondary)
        }
      }
    }
  }

  private func loadProfessorProfileIfNeeded() async {
    guard sessionStore.currentRole == .professor,
          let token = sessionStore.token else {
      professorProfile = nil
      return
    }

    isLoading = true
    defer { isLoading = false }

    do {
      let response = try await APIClient.shared.payments(token: token)
      professorProfile = response.profile
    } catch {
      print("[profile] load professor profile failed", error)
    }
  }

  private func infoCard<Content: View>(@ViewBuilder content: () -> Content) -> some View {
    content()
      .frame(maxWidth: .infinity, alignment: .leading)
      .padding()
      .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 16))
  }

  private func label(for role: MobileRole) -> String {
    switch role {
    case .member:
      return "Socio"
    case .professor:
      return "Profesor"
    }
  }

  private func currency(_ amount: Int) -> String {
    let formatter = NumberFormatter()
    formatter.numberStyle = .currency
    formatter.locale = Locale(identifier: "es_AR")
    formatter.currencyCode = "ARS"
    return formatter.string(from: NSNumber(value: Double(amount) / 100.0))
      ?? "ARS \(amount)"
  }
}
