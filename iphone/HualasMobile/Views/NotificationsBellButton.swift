import SwiftUI

struct NotificationsBellButton: View {
  let unreadCount: Int
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      ZStack(alignment: .topTrailing) {
        Image(systemName: unreadCount > 0 ? "bell.fill" : "bell")
          .font(.system(size: 17, weight: .semibold))
          .foregroundStyle(unreadCount > 0 ? Color.white : Color.primary)
          .frame(width: 38, height: 38)
          .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
              .fill(unreadCount > 0 ? Color.accentColor : Color.secondary.opacity(0.12))
          )
          .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
              .stroke(Color.white.opacity(0.08), lineWidth: 1)
          )

        if unreadCount > 0 {
          Text(unreadCount > 9 ? "9+" : "\(unreadCount)")
            .font(.caption2.weight(.bold))
            .foregroundStyle(.white)
            .padding(.horizontal, 5)
            .padding(.vertical, 2)
            .background(Color.red, in: Capsule())
            .offset(x: 5, y: -6)
        }
      }
      .shadow(color: .black.opacity(0.08), radius: 10, x: 0, y: 5)
    }
    .buttonStyle(.plain)
    .accessibilityLabel("Notificaciones")
    .accessibilityValue(unreadCount > 0 ? "\(unreadCount) sin leer" : "Sin notificaciones sin leer")
  }
}
