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

          quickActions

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

  private var quickActions: some View {
    VStack(alignment: .leading, spacing: 8) {
      Text("Accesos rápidos")
        .font(.headline)

      NavigationLink {
        ProfileEditView()
      } label: {
        profileActionRow(
          title: "Editar perfil",
          subtitle: "Actualizar tus datos personales.",
          systemImage: "pencil"
        )
      }
      .buttonStyle(.plain)

      if sessionStore.currentRole == .professor {
        NavigationLink {
          PaymentsView()
        } label: {
          profileActionRow(
            title: "Pagos",
            subtitle: "Ver tu información de cobros y perfil bancario.",
            systemImage: "creditcard"
          )
        }
        .buttonStyle(.plain)
      }
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

  private func profileActionRow(
    title: String,
    subtitle: String,
    systemImage: String
  ) -> some View {
    HStack(spacing: 12) {
      Image(systemName: systemImage)
        .font(.headline)
        .foregroundStyle(Color.accentColor)
        .frame(width: 28, height: 28)
        .background(Color.accentColor.opacity(0.12), in: RoundedRectangle(cornerRadius: 8))

      VStack(alignment: .leading, spacing: 2) {
        Text(title)
          .font(.headline)
          .foregroundStyle(.primary)
        Text(subtitle)
          .font(.footnote)
          .foregroundStyle(.secondary)
      }

      Spacer()

      Image(systemName: "chevron.right")
        .font(.caption.weight(.semibold))
        .foregroundStyle(.tertiary)
    }
    .padding(14)
    .background(
      RoundedRectangle(cornerRadius: 16, style: .continuous)
        .fill(Color.secondary.opacity(0.06))
    )
    .overlay(
      RoundedRectangle(cornerRadius: 16, style: .continuous)
        .stroke(Color.secondary.opacity(0.08), lineWidth: 1)
    )
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
    formatter.maximumFractionDigits = 0
    formatter.minimumFractionDigits = 0
    return formatter.string(from: NSNumber(value: amount))
      ?? "ARS \(amount)"
  }
}
