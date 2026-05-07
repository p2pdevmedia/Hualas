import Foundation

enum MobileRole: String, Codable {
  case member = "MEMBER"
  case professor = "PROFESSOR"
}

struct MobileLoginRequest: Codable {
  let email: String
  let password: String
  let role: MobileRole?
  let platform: String?
  let deviceName: String?
  let deviceModel: String?
  let appVersion: String?
}

struct MobileLoginResponse: Codable {
  struct Session: Codable {
    let id: String
    let appRole: MobileRole
    let expiresAt: String
  }

  struct User: Codable {
    let id: String
    let email: String
    let name: String?
    let lastName: String?
    let role: String
    let activeRole: String
    let allowedRoles: [MobileRole]
  }

  let token: String
  let session: Session
  let user: User
}

struct MobileMeResponse: Codable {
  struct User: Codable {
    let id: String
    let email: String
    let name: String?
    let lastName: String?
    let role: String
    let activeRole: String
    let mobileRole: MobileRole
    let allowedRoles: [MobileRole]
    let isActive: Bool
  }

  struct Session: Codable {
    let id: String
    let appRole: MobileRole
    let expiresAt: String
    let lastUsedAt: String
  }

  let user: User
  let session: Session
}

struct MobileProfileResponse: Codable {
  struct User: Codable {
    let id: String
    let email: String
    let name: String?
    let lastName: String?
    let dni: String?
    let birthDate: String?
    let gender: String?
    let address: String?
    let phone: String?
    let nationality: String?
    let maritalStatus: String?
    let allergies: String?
    let regularMedication: String?
    let relevantDiseases: String?
    let previousInjuries: String?
    let physicalRestrictions: String?
    let bloodGroup: String?
    let primaryDoctor: String?
    let doctorPhone: String?
    let doctorCertificate: String?
    let socialFeeActive: Bool
  }

  let user: User
}

struct MobileProfileUpdateRequest: Codable {
  let name: String?
  let lastName: String?
  let dni: String?
  let birthDate: String?
  let gender: String?
  let address: String?
  let phone: String?
  let nationality: String?
  let maritalStatus: String?
  let allergies: String?
  let regularMedication: String?
  let relevantDiseases: String?
  let previousInjuries: String?
  let physicalRestrictions: String?
  let bloodGroup: String?
  let primaryDoctor: String?
  let doctorPhone: String?
  let doctorCertificate: String?
  let socialFeeActive: Bool?
  let email: String?
  let password: String?
}

struct MobileHomeResponse: Codable {
  struct Profile: Codable {
    let id: String
    let name: String
    let email: String
  }

  struct Stats: Codable {
    let childrenCount: Int?
    let activitiesCount: Int
    let upcomingDaysCount: Int
    let unreadNotificationsCount: Int
    let groupsCount: Int?
    let pendingAttendanceCount: Int?
  }

  struct Activity: Codable, Identifiable {
    let id: String
    let name: String
    let date: String?
    let endDate: String?
    let frequency: String
    let price: Int?
    let participantName: String?
    let participantLabels: [String]?
    let groupName: String?
    let groupsCount: Int?
    let description: String?
    let upcomingDays: [UpcomingDay]?
    let nextDays: [UpcomingDay]?
  }

  struct Child: Codable, Identifiable {
    let id: String
    let name: String
    let lastName: String?
    let birthDate: String?
    let profilePhoto: String?
  }

  struct UpcomingDay: Codable, Identifiable {
    let id: String
    let activityId: String
    let activityName: String
    let groupName: String?
    let date: String?
    let schedule: String
    let geoLocation: String
    let cancelled: Bool
  }

  struct NewsItem: Codable, Identifiable {
    struct Media: Codable, Identifiable {
      let id: String
      let url: String
      let mimeType: String
      let type: String
      let fileName: String?
    }

    let id: String
    let title: String
    let body: String
    let scope: String
    let activityId: String?
    let activityName: String?
    let author: String
    let createdAt: String?
    let media: [Media]
  }

  let kind: String
  let profile: Profile
  let stats: Stats
  let children: [Child]?
  let activities: [Activity]
  let upcomingDays: [UpcomingDay]
  let recentNews: [NewsItem]
}

struct MobilePaymentsResponse: Codable {
  struct Profile: Codable {
    let id: String
    let monthlySalary: Int
    let bankName: String?
    let cbu: String?
    let alias: String?
    let cuit: String?
    let notes: String?
  }

  struct Payment: Codable, Identifiable {
    let id: String
    let kind: String
    let status: String
    let date: String?
    let title: String
    let subtitle: String?
    let reference: String?
    let amount: Int
    let amountLabel: String
    let periodMonth: Int?
    let periodYear: Int?
    let notes: String?
  }

  let role: MobileRole
  let profile: Profile?
  let payments: [Payment]
}

struct MobileChildrenResponse: Codable {
  struct Child: Codable, Identifiable {
    let id: String
    let name: String
    let lastName: String?
    let birthDate: String?
    let address: String?
    let profilePhoto: String?
    let allergies: String?
    let regularMedication: String?
    let relevantDiseases: String?
    let previousInjuries: String?
    let physicalRestrictions: String?
    let observations: String?
  }

  let children: [Child]
}

struct MobileActivitiesResponse: Codable {
  struct UpcomingDay: Codable, Identifiable {
    let id: String
    let date: String?
    let schedule: String
    let groupName: String?
    let activityGroupId: String?
  }

  struct Activity: Codable, Identifiable {
    let id: String
    let name: String
    let date: String?
    let endDate: String?
    let frequency: String
    let price: Int?
    let description: String?
    let participantLabels: [String]?
    let groupName: String?
    let groupsCount: Int?
    let upcomingDays: [UpcomingDay]?
    let nextDays: [UpcomingDay]?
  }

  let role: MobileRole
  let activities: [Activity]
}

struct MobileActivityCatalogResponse: Codable {
  struct Group: Codable, Identifiable {
    let id: String
    let name: String
    let description: String?
    let capacity: Int?
    let minAge: Int?
    let maxAge: Int?
    let memberCount: Int
    let remainingCapacity: Int?
  }

  struct Day: Codable, Identifiable {
    let id: String
    let date: String?
    let weekday: Int
    let schedule: String
    let geoLocation: String
    let activityGroupId: String?
    let groupName: String?
    let cancelled: Bool
  }

  struct Activity: Codable, Identifiable {
    let id: String
    let name: String
    let date: String?
    let endDate: String?
    let activityType: String
    let frequency: String
    let image: String?
    let description: String?
    let price: Int
    let participantCount: Int
    let groupCount: Int
    let hasAvailability: Bool
    let availabilityStatus: String
    let availabilityLabel: String
    let groups: [Group]
    let days: [Day]
  }

  let role: MobileRole
  let activities: [Activity]
}

struct MobileActivityCartItem: Codable, Identifiable, Hashable {
  let activityId: String
  let target: String?
  let targetLabel: String?
  let groupId: String?
  let activityDayId: String?
  let activityDayLabel: String?

  var id: String {
    [activityId, target ?? "self"].joined(separator: ":")
  }
}

struct MobileActivityCartQuoteResponse: Codable {
  struct ActivityLine: Codable, Identifiable {
    let id: String
    let name: String
    let amount: Int
    let targetLabel: String
    let activityDayLabel: String?
  }

  struct DiscountLine: Codable, Identifiable {
    let amount: Int
    let label: String
    var id: String { label }
  }

  struct SocialFeeParticipant: Codable, Identifiable, Hashable {
    let userId: String
    let childId: String?

    var id: String {
      [userId, childId ?? "self"].joined(separator: ":")
    }
  }

  struct SocialFeeLine: Codable, Identifiable {
    let participant: SocialFeeParticipant
    let amount: Int
    let label: String
    var id: String { participant.id }
  }

  struct MercadoPagoFeeLine: Codable, Identifiable {
    let amount: Int
    let label: String
    var id: String { label }
  }

  let activityLines: [ActivityLine]
  let discountLines: [DiscountLine]
  let socialFeeLines: [SocialFeeLine]
  let mercadoPagoFeeLines: [MercadoPagoFeeLine]
  let totalActivityAmount: Int
  let totalDiscountAmount: Int
  let totalSocialFeeAmount: Int
  let totalMercadoPagoFeeAmount: Int
  let totalAmount: Int
  let totalAmountWithMercadoPagoFee: Int
  let socialFeeAmount: Int
}

enum MobileActivityPaymentMethod: String, Codable {
  case mercadoPago = "MERCADO_PAGO"
  case manualTransfer = "MANUAL_TRANSFER"
}

struct MobileActivityCheckoutResponse: Codable {
  let success: Bool?
  let paymentId: String?
  let orderId: String?
  let redirectUrl: String?
  let error: String?
}

struct MobileActivitiesCalendarResponse: Codable {
  struct Session: Codable, Identifiable {
    let id: String
    let date: String
    let activityId: String
    let activityName: String
    let schedule: String
    let geoLocation: String
    let groupName: String?
    let activityGroupId: String?
    let cancelled: Bool
  }

  let role: MobileRole
  let month: String
  let monthLabel: String
  let sessions: [Session]
}

struct MobileActivitySessionDetailResponse: Codable, Identifiable {
  struct Day: Codable {
    let id: String
    let date: String
    let schedule: String
    let geoLocation: String
    let description: String?
    let planificacion: String?
    let devolucion: String?
    let cancelled: Bool
    let cancellationReason: String?
    let activity: Activity
    let groupName: String?
  }

  struct Activity: Codable {
    let id: String
    let name: String
    let price: Int
  }

  struct Professor: Codable, Identifiable {
    let id: String
    let label: String
    let phone: String?
  }

  struct Participant: Codable, Identifiable {
    struct Attendance: Codable {
      let status: String
      let confirmedAt: String?
    }

    let id: String
    let userId: String
    let childId: String?
    let label: String
    let groupName: String?
    let attendance: Attendance
  }

  let role: MobileRole
  let day: Day
  let professors: [Professor]
  let participants: [Participant]

  var id: String { day.id }
}

struct MobileNewsResponse: Codable {
  struct NewsItem: Codable, Identifiable {
    struct Media: Codable, Identifiable {
      let id: String
      let url: String
      let mimeType: String
      let type: String
      let fileName: String?
    }

    let id: String
    let title: String
    let body: String
    let scope: String
    let activityId: String?
    let activityName: String?
    let author: String
    let createdAt: String?
    let media: [Media]
  }

  let news: [NewsItem]
}

struct MobileGroupsResponse: Codable {
  struct Member: Codable, Identifiable {
    let id: String
    let userId: String
    let label: String
  }

  struct Group: Codable, Identifiable {
    let id: String
    let name: String
    let description: String?
    let capacity: Int?
    let minAge: Int?
    let maxAge: Int?
    let createdAt: String?
    let activity: Activity
    let memberCount: Int
    let members: [Member]
  }

  struct Activity: Codable {
    let id: String
    let name: String
  }

  let groups: [Group]
}

struct MobileProfessorGroupDetailResponse: Codable {
  struct Group: Codable {
    let id: String
    let name: String
    let description: String?
    let capacity: Int?
    let minAge: Int?
    let maxAge: Int?
    let createdAt: String
    let memberCount: Int
    let activity: Activity
  }

  struct Activity: Codable {
    let id: String
    let name: String
    let description: String?
    let date: String
    let endDate: String
  }

  struct Member: Codable, Identifiable {
    struct Contact: Codable {
      let name: String
      let email: String?
      let phone: String?
    }

    let id: String
    let userId: String
    let childId: String?
    let label: String
    let childLabel: String?
    let contact: Contact
  }

  let group: Group
  let members: [Member]
}

struct MobileStudentsResponse: Codable {
  struct Student: Codable, Identifiable {
    let id: String
    let userId: String
    let childId: String?
    let participantKey: String
    let label: String
    let birthDate: String?
    let activity: Activity
    let groupName: String?
    let lastPayment: LastPayment?
  }

  struct Activity: Codable {
    let id: String
    let name: String
  }

  struct LastPayment: Codable {
    let id: String
    let amount: Int
    let paymentReference: String
    let paidAt: String?
  }

  let students: [Student]
}

struct MobileConversationListResponse: Codable {
  struct Conversation: Codable, Identifiable {
    struct Peer: Codable {
      let id: String
      let name: String?
      let lastName: String?
      let email: String?
      let phone: String?
      let role: String
      let profilePhoto: String?
    }

    struct Message: Codable {
      let id: String
      let from: String
      let content: String
      let createdAt: String
      let readAt: String?
    }

    let id: String
    let peer: Peer?
    let title: String
    let subtitle: String?
    let lastMessage: Message?
    let unreadCount: Int
  }

  let conversations: [Conversation]
}

struct MobileConversationThreadResponse: Codable {
  struct Peer: Codable {
    let id: String
    let name: String?
    let lastName: String?
    let email: String?
    let phone: String?
    let role: String
    let profilePhoto: String?
    let label: String
  }

  struct Message: Codable, Identifiable {
    let id: String
    let from: String
    let content: String
    let createdAt: String
    let readAt: String?
  }

  let conversationId: String?
  let peer: Peer?
  var messages: [Message]
}

struct MobileAttendanceListResponse: Codable {
  struct Day: Codable, Identifiable {
    let id: String
    let date: String?
    let schedule: String
    let geoLocation: String
    let cancelled: Bool
    let activityGroupId: String?
    let activity: Activity
    let groupName: String?
    let attendanceCount: Int
  }

  struct Activity: Codable {
    let id: String
    let name: String
  }

  let days: [Day]
}

struct MobileAttendanceDetailResponse: Codable {
  struct Day: Codable {
    let id: String
    let date: String?
    let schedule: String
    let geoLocation: String
    let description: String?
    let planificacion: String?
    let devolucion: String?
    let cancelled: Bool
    let cancellationReason: String?
    let activity: Activity
    let groupName: String?
  }

  struct Activity: Codable {
    let id: String
    let name: String
  }

  struct Participant: Codable, Identifiable {
    struct Attendance: Codable {
      let id: String?
      let status: String
      let confirmedAt: String?
    }

    let id: String
    let userId: String
    let label: String
    let groupName: String?
    let attendance: Attendance
  }

  let day: Day
  let participants: [Participant]
}

struct MobileAttendanceUpdateResponse: Codable {
  struct Attendance: Codable {
    let id: String
    let activityDayId: String
    let activityParticipantId: String
    let status: String
    let confirmedAt: String?
  }

  let attendance: Attendance
}
