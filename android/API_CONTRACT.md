# Hualas Android API Contract

This document maps the current mobile backend routes to the Android app scope.

## Auth And Session

| Method | Path                           | Role              | Android owner | Purpose                                                          |
| ------ | ------------------------------ | ----------------- | ------------- | ---------------------------------------------------------------- |
| POST   | `/api/mobile/auth/login`       | Public            | Auth          | Log in with email/password and receive a mobile Bearer token.    |
| POST   | `/api/mobile/auth/logout`      | MEMBER, PROFESSOR | Auth          | Revoke current mobile session.                                   |
| POST   | `/api/mobile/auth/switch-role` | MEMBER, PROFESSOR | Auth          | Switch active mobile role when the user has both roles.          |
| GET    | `/api/mobile/me`               | MEMBER, PROFESSOR | Session       | Restore session, user identity, current role, and allowed roles. |

## Shared Home And Communication

| Method | Path                             | Role              | Android owner | Purpose                                                        |
| ------ | -------------------------------- | ----------------- | ------------- | -------------------------------------------------------------- |
| GET    | `/api/mobile/home`               | MEMBER, PROFESSOR | Home          | Role-specific dashboard data.                                  |
| GET    | `/api/mobile/news`               | MEMBER, PROFESSOR | News          | News feed visible to the current user.                         |
| POST   | `/api/mobile/news/read`          | MEMBER, PROFESSOR | News          | Mark news item as read.                                        |
| GET    | `/api/mobile/messages`           | MEMBER, PROFESSOR | Chat          | Conversation list.                                             |
| GET    | `/api/mobile/messages/[userId]`  | MEMBER, PROFESSOR | Chat          | Message thread with one user.                                  |
| POST   | `/api/mobile/messages/[userId]`  | MEMBER, PROFESSOR | Chat          | Send a message to one user.                                    |
| GET    | `/api/mobile/chat/contacts`      | MEMBER, PROFESSOR | Chat          | Allowed mobile chat contacts.                                  |
| GET    | `/api/mobile/notifications`      | MEMBER, PROFESSOR | Notifications | Notification inbox.                                            |
| PATCH  | `/api/mobile/notifications`      | MEMBER, PROFESSOR | Notifications | Mark all notifications as read.                                |
| PATCH  | `/api/mobile/notifications/[id]` | MEMBER, PROFESSOR | Notifications | Mark notification read or update notification state.           |
| POST   | `/api/mobile/devices`            | MEMBER, PROFESSOR | Notifications | Register Android FCM token. Always send `platform: "Android"`. |

## Activities

| Method | Path                                   | Role              | Android owner | Purpose                                           |
| ------ | -------------------------------------- | ----------------- | ------------- | ------------------------------------------------- |
| GET    | `/api/mobile/activities`               | MEMBER, PROFESSOR | Activities    | Agenda and activity day list for current role.    |
| GET    | `/api/mobile/activities/[dayId]`       | MEMBER, PROFESSOR | Activities    | Activity day detail.                              |
| GET    | `/api/mobile/activities/available`     | MEMBER            | Activities    | Activities available for member registration.     |
| POST   | `/api/mobile/activities/cart/quote`    | MEMBER            | Activities    | Quote activity registration before checkout.      |
| POST   | `/api/mobile/activities/cart/checkout` | MEMBER            | Activities    | Create checkout and open returned URL externally. |

`POST /api/mobile/activities/cart/quote` also returns current-month annual
activity debt when already-registered participants have no
`ActivityParticipantPayment` for the period:

- `activityMonthlyPaymentLines`: list of pending monthly activity lines. Each
  line includes `activityParticipantId`, `activityId`, `activityName`,
  `userId`, `childId`, `targetLabel`, `amount`, `periodMonth`, `periodYear`,
  and `label`.
- `totalActivityMonthlyPaymentAmount`: cent-based total for those pending
  activity lines.

The checkout endpoint carries those quoted lines through Mercado Pago/manual
payment metadata so approval registers the exact monthly period.

## Member

| Method | Path                                        | Role   | Android owner  | Purpose                                               |
| ------ | ------------------------------------------- | ------ | -------------- | ----------------------------------------------------- |
| GET    | `/api/mobile/profile`                       | MEMBER | Profile        | Load member profile.                                  |
| PATCH  | `/api/mobile/profile`                       | MEMBER | Profile        | Update member profile.                                |
| GET    | `/api/mobile/profile/photo`                 | MEMBER | Profile        | Fetch profile photo.                                  |
| POST   | `/api/mobile/profile/photo`                 | MEMBER | Profile        | Upload profile photo.                                 |
| GET    | `/api/mobile/children`                      | MEMBER | Children       | List children in family context.                      |
| POST   | `/api/mobile/children`                      | MEMBER | Children       | Create child profile.                                 |
| GET    | `/api/mobile/children/[id]`                 | MEMBER | Children       | Load child profile.                                   |
| PUT    | `/api/mobile/children/[id]`                 | MEMBER | Children       | Update child profile.                                 |
| GET    | `/api/mobile/children/[id]/photo`           | MEMBER | Children       | Fetch child photo.                                    |
| POST   | `/api/mobile/children/[id]/photo`           | MEMBER | Children       | Upload child photo.                                   |
| GET    | `/api/mobile/family-groups/current/members` | MEMBER | Family         | Current family group members.                         |
| POST   | `/api/mobile/family-groups/current/members` | MEMBER | Family         | Add a family group member/tutor.                      |
| DELETE | `/api/mobile/family-groups/current/members` | MEMBER | Family         | Remove a family group member/tutor.                   |
| GET    | `/api/mobile/payments`                      | MEMBER | Payments       | Member payments and manual transfer state.            |
| GET    | `/api/mobile/pickup-notices`                | MEMBER | Pickup notices | List pickup notices.                                  |
| POST   | `/api/mobile/pickup-notices`                | MEMBER | Pickup notices | Create pickup notice.                                 |
| GET    | `/api/mobile/pickup-notices/options`        | MEMBER | Pickup notices | Load activity day options for pickup notice creation. |
| PUT    | `/api/mobile/pickup-notices/[noticeId]`     | MEMBER | Pickup notices | Update pickup notice.                                 |
| DELETE | `/api/mobile/pickup-notices/[noticeId]`     | MEMBER | Pickup notices | Delete pickup notice.                                 |

## Professor

| Method | Path                                       | Role      | Android owner | Purpose                                                          |
| ------ | ------------------------------------------ | --------- | ------------- | ---------------------------------------------------------------- |
| GET    | `/api/mobile/professor/attendance`         | PROFESSOR | Professor     | Upcoming attendance days.                                        |
| GET    | `/api/mobile/professor/attendance/[dayId]` | PROFESSOR | Professor     | Attendance detail for one day.                                   |
| PATCH  | `/api/mobile/professor/attendance/[dayId]` | PROFESSOR | Professor     | Update participant attendance status.                            |
| GET    | `/api/mobile/professor/groups`             | PROFESSOR | Professor     | Groups assigned to professor activities.                         |
| GET    | `/api/mobile/professor/groups/[groupId]`   | PROFESSOR | Professor     | Group detail.                                                    |
| GET    | `/api/mobile/professor/students`           | PROFESSOR | Professor     | Students for professor activities, optionally filtered by group. |
| GET    | `/api/mobile/payments`                     | PROFESSOR | Payments      | Professor banking profile and payment history.                   |

## Android Contract Rules

- All authenticated calls use `Authorization: Bearer <mobile-token>`.
- Treat `401` as an expired/revoked session and return to login.
- Treat `403` as a role/permission mismatch and show a role-aware forbidden state.
- Do not call admin, accounting admin, or NextAuth cookie routes from Android.
- Use Spanish user-facing errors and empty states.
