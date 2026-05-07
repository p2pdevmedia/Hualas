import Foundation

enum MobileRole: String, Codable {
  case member = "MEMBER"
  case professor = "PROFESSOR"
}

struct MobileLoginRequest: Codable {
  let email: String
  let password: String
  let role: MobileRole
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

