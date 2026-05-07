import SwiftUI

struct LoginView: View {
  @EnvironmentObject private var sessionStore: SessionStore
  @State private var email = ""
  @State private var password = ""

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(alignment: .leading, spacing: 20) {
          Text("Hualas")
            .font(.largeTitle.bold())
          Text("Acceso móvil para socios y profesores con un solo ingreso.")
            .foregroundStyle(.secondary)

          VStack(spacing: 14) {
            TextField("Email", text: $email)
              .textInputAutocapitalization(.never)
              .keyboardType(.emailAddress)
              .textFieldStyle(.roundedBorder)

            SecureField("Contraseña", text: $password)
              .textFieldStyle(.roundedBorder)

            if let error = sessionStore.errorMessage {
              Text(error)
                .font(.footnote)
                .foregroundStyle(.red)
            }

            Button {
              Task {
                await sessionStore.login(email: email, password: password)
              }
            } label: {
              Text("Ingresar")
                .frame(maxWidth: .infinity)
                .padding()
                .foregroundStyle(.white)
                .background(.blue, in: RoundedRectangle(cornerRadius: 14))
            }
            .disabled(email.isEmpty || password.isEmpty)
          }
          .padding(.top, 8)
        }
        .padding(24)
      }
    }
  }
}
