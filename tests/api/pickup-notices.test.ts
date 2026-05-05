/**
 * @jest-environment node
 */

jest.mock('next-auth');
jest.mock('@/lib/auth');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    pickupNotice: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    pickupNoticeAcknowledgment: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    activityDay: {
      findUnique: jest.fn(),
    },
    child: {
      findUnique: jest.fn(),
    },
    activityParticipant: {
      findFirst: jest.fn(),
    },
    activityDayProfessor: {
      findFirst: jest.fn(),
    },
  },
}));

import {
  POST as postPickupNotice,
  GET as getPickupNotices,
} from '@/app/api/activity-days/[dayId]/pickup-notices/route';
import {
  PUT as putNotice,
  DELETE as deleteNotice,
} from '@/app/api/pickup-notices/[noticeId]/route';
import { POST as postAcknowledgment } from '@/app/api/pickup-notices/[noticeId]/acknowledgments/route';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';

const mockPrisma = prisma as {
  pickupNotice: {
    create: jest.Mock;
    findUnique: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
    deleteMany: jest.Mock;
  };
  pickupNoticeAcknowledgment: {
    upsert: jest.Mock;
    deleteMany: jest.Mock;
  };
  activityDay: {
    findUnique: jest.Mock;
  };
  child: {
    findUnique: jest.Mock;
  };
  activityParticipant: {
    findFirst: jest.Mock;
  };
  activityDayProfessor: {
    findFirst: jest.Mock;
  };
};

const FUTURE_DATE = new Date(Date.now() + 1000 * 60 * 60 * 24);
const PAST_DATE = new Date(Date.now() - 1000 * 60 * 60 * 24);

const SESSION_USER = { id: 'user_111', role: 'MEMBER' };
const PROFESSOR_USER = { id: 'prof_222', role: 'PROFESSOR' };

const DAY_ID = 'day_456';
const CHILD_ID = 'child_789';
const NOTICE_ID = 'notice_123';

function makePostRequest(body: object) {
  return new Request(
    `http://localhost/api/activity-days/${DAY_ID}/pickup-notices`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
}

function makeNoticeContext(noticeId = NOTICE_ID) {
  return { params: Promise.resolve({ noticeId }) };
}

function makeDayContext(dayId = DAY_ID) {
  return { params: Promise.resolve({ dayId }) };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// POST /api/activity-days/[dayId]/pickup-notices
// ---------------------------------------------------------------------------

describe('POST /api/activity-days/[dayId]/pickup-notices', () => {
  it('returns 401 when there is no session', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce(null);

    const res = await postPickupNotice(
      makePostRequest({
        childId: CHILD_ID,
        alternatePersonName: 'Tía María',
        description: 'Test',
      }),
      makeDayContext()
    );

    expect(res.status).toBe(401);
  });

  it('returns 404 when activity day is not found', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: SESSION_USER,
    });
    mockPrisma.activityDay.findUnique.mockResolvedValueOnce(null);

    const res = await postPickupNotice(
      makePostRequest({
        childId: CHILD_ID,
        alternatePersonName: 'Tía María',
        description: 'Test',
      }),
      makeDayContext()
    );

    expect(res.status).toBe(404);
  });

  it('returns 400 when activity day is in the past', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: SESSION_USER,
    });
    mockPrisma.activityDay.findUnique.mockResolvedValueOnce({
      id: DAY_ID,
      date: PAST_DATE,
      activityId: 'act_001',
      activity: { id: 'act_001', name: 'Test Activity' },
    });

    const res = await postPickupNotice(
      makePostRequest({
        childId: CHILD_ID,
        alternatePersonName: 'Tía María',
        description: 'Test',
      }),
      makeDayContext()
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('past activity day');
  });

  it('returns 403 when child does not belong to the current user', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: SESSION_USER,
    });
    mockPrisma.activityDay.findUnique.mockResolvedValueOnce({
      id: DAY_ID,
      date: FUTURE_DATE,
      activityId: 'act_001',
      activity: { id: 'act_001' },
    });
    mockPrisma.child.findUnique.mockResolvedValueOnce({
      id: CHILD_ID,
      userId: 'other_user',
    });

    const res = await postPickupNotice(
      makePostRequest({
        childId: CHILD_ID,
        alternatePersonName: 'Tía María',
        description: 'Test',
      }),
      makeDayContext()
    );

    expect(res.status).toBe(403);
  });

  it('returns 400 when child is not enrolled in the activity', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: SESSION_USER,
    });
    mockPrisma.activityDay.findUnique.mockResolvedValueOnce({
      id: DAY_ID,
      date: FUTURE_DATE,
      activityId: 'act_001',
      activity: { id: 'act_001' },
    });
    mockPrisma.child.findUnique.mockResolvedValueOnce({
      id: CHILD_ID,
      userId: SESSION_USER.id,
    });
    mockPrisma.activityParticipant.findFirst.mockResolvedValueOnce(null);

    const res = await postPickupNotice(
      makePostRequest({
        childId: CHILD_ID,
        alternatePersonName: 'Tía María',
        description: 'Test',
      }),
      makeDayContext()
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('not enrolled');
  });

  it('returns 400 when an active notice already exists for the same child+day', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: SESSION_USER,
    });
    mockPrisma.activityDay.findUnique.mockResolvedValueOnce({
      id: DAY_ID,
      date: FUTURE_DATE,
      activityId: 'act_001',
      activity: { id: 'act_001' },
    });
    mockPrisma.child.findUnique.mockResolvedValueOnce({
      id: CHILD_ID,
      userId: SESSION_USER.id,
    });
    mockPrisma.activityParticipant.findFirst.mockResolvedValueOnce({
      id: 'part_001',
    });
    mockPrisma.pickupNotice.findUnique.mockResolvedValueOnce({
      id: NOTICE_ID,
      deletedAt: null,
    });

    const res = await postPickupNotice(
      makePostRequest({
        childId: CHILD_ID,
        alternatePersonName: 'Tía María',
        description: 'Test',
      }),
      makeDayContext()
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('already exists');
  });

  it('creates a pickup notice when all validations pass', async () => {
    const createdNotice = {
      id: NOTICE_ID,
      activityDayId: DAY_ID,
      childId: CHILD_ID,
      createdById: SESSION_USER.id,
      alternatePersonName: 'Tía María',
      alternatePersonUserId: null,
      description: 'Sister will pick up',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      acknowledgments: [],
    };

    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: SESSION_USER,
    });
    mockPrisma.activityDay.findUnique.mockResolvedValueOnce({
      id: DAY_ID,
      date: FUTURE_DATE,
      activityId: 'act_001',
      activity: { id: 'act_001' },
    });
    mockPrisma.child.findUnique.mockResolvedValueOnce({
      id: CHILD_ID,
      userId: SESSION_USER.id,
    });
    mockPrisma.activityParticipant.findFirst.mockResolvedValueOnce({
      id: 'part_001',
    });
    mockPrisma.pickupNotice.findUnique.mockResolvedValueOnce(null);
    mockPrisma.pickupNotice.create.mockResolvedValueOnce(createdNotice);

    const res = await postPickupNotice(
      makePostRequest({
        childId: CHILD_ID,
        alternatePersonName: 'Tía María',
        description: 'Sister will pick up',
      }),
      makeDayContext()
    );

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.alternatePersonName).toBe('Tía María');
    expect(json.deletedAt).toBeNull();
    expect(mockPrisma.pickupNotice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          activityDayId: DAY_ID,
          childId: CHILD_ID,
          createdById: SESSION_USER.id,
          alternatePersonName: 'Tía María',
        }),
      })
    );
  });

  it('restores a soft-deleted notice instead of creating a duplicate', async () => {
    const softDeletedNotice = {
      id: NOTICE_ID,
      activityDayId: DAY_ID,
      childId: CHILD_ID,
      createdById: SESSION_USER.id,
      alternatePersonName: 'Old Name',
      alternatePersonUserId: null,
      description: 'Old description',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: PAST_DATE,
    };
    const restoredNotice = {
      ...softDeletedNotice,
      alternatePersonName: 'Tía María',
      description: 'Restored',
      deletedAt: null,
      acknowledgments: [],
    };

    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: SESSION_USER,
    });
    mockPrisma.activityDay.findUnique.mockResolvedValueOnce({
      id: DAY_ID,
      date: FUTURE_DATE,
      activityId: 'act_001',
      activity: { id: 'act_001' },
    });
    mockPrisma.child.findUnique.mockResolvedValueOnce({
      id: CHILD_ID,
      userId: SESSION_USER.id,
    });
    mockPrisma.activityParticipant.findFirst.mockResolvedValueOnce({
      id: 'part_001',
    });
    mockPrisma.pickupNotice.findUnique.mockResolvedValueOnce(softDeletedNotice);
    mockPrisma.pickupNotice.update.mockResolvedValueOnce(restoredNotice);

    const res = await postPickupNotice(
      makePostRequest({
        childId: CHILD_ID,
        alternatePersonName: 'Tía María',
        description: 'Restored',
      }),
      makeDayContext()
    );

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.deletedAt).toBeNull();
    expect(mockPrisma.pickupNotice.create).not.toHaveBeenCalled();
    expect(mockPrisma.pickupNotice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: NOTICE_ID },
        data: expect.objectContaining({ deletedAt: null }),
      })
    );
  });

  it('returns 400 when validation fails (missing description)', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: SESSION_USER,
    });

    const res = await postPickupNotice(
      makePostRequest({ childId: CHILD_ID, alternatePersonName: 'Tía María' }),
      makeDayContext()
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Invalid input');
  });
});

// ---------------------------------------------------------------------------
// GET /api/activity-days/[dayId]/pickup-notices
// ---------------------------------------------------------------------------

describe('GET /api/activity-days/[dayId]/pickup-notices', () => {
  it('returns 401 when not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce(null);

    const req = new Request(
      `http://localhost/api/activity-days/${DAY_ID}/pickup-notices`
    );
    const res = await getPickupNotices(req as any, makeDayContext());

    expect(res.status).toBe(401);
  });

  it('returns 404 when activity day not found', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: PROFESSOR_USER,
    });
    mockPrisma.activityDay.findUnique.mockResolvedValueOnce(null);

    const req = new Request(
      `http://localhost/api/activity-days/${DAY_ID}/pickup-notices`
    );
    const res = await getPickupNotices(req as any, makeDayContext());

    expect(res.status).toBe(404);
  });

  it('returns 403 when professor is not assigned to the day', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: PROFESSOR_USER,
    });
    mockPrisma.activityDay.findUnique.mockResolvedValueOnce({
      id: DAY_ID,
      date: FUTURE_DATE,
    });
    mockPrisma.activityDayProfessor.findFirst.mockResolvedValueOnce(null);

    const req = new Request(
      `http://localhost/api/activity-days/${DAY_ID}/pickup-notices`
    );
    const res = await getPickupNotices(req as any, makeDayContext());

    expect(res.status).toBe(403);
  });

  it('returns 200 with notices for an assigned professor', async () => {
    const notices = [
      {
        id: NOTICE_ID,
        activityDayId: DAY_ID,
        childId: CHILD_ID,
        createdById: SESSION_USER.id,
        alternatePersonName: 'Tía María',
        deletedAt: null,
        acknowledgments: [],
      },
    ];

    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: PROFESSOR_USER,
    });
    mockPrisma.activityDay.findUnique.mockResolvedValueOnce({
      id: DAY_ID,
      date: FUTURE_DATE,
    });
    mockPrisma.activityDayProfessor.findFirst.mockResolvedValueOnce({
      id: 'adp_001',
    });
    mockPrisma.pickupNotice.findMany.mockResolvedValueOnce(notices);

    const req = new Request(
      `http://localhost/api/activity-days/${DAY_ID}/pickup-notices`
    );
    const res = await getPickupNotices(req as any, makeDayContext());

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveLength(1);
    expect(json[0].alternatePersonName).toBe('Tía María');
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/pickup-notices/[noticeId] (soft delete)
// ---------------------------------------------------------------------------

describe('DELETE /api/pickup-notices/[noticeId]', () => {
  it('returns 401 when not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce(null);

    const req = new Request(
      `http://localhost/api/pickup-notices/${NOTICE_ID}`,
      { method: 'DELETE' }
    );
    const res = await deleteNotice(req as any, makeNoticeContext());

    expect(res.status).toBe(401);
  });

  it('returns 404 when notice not found', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: SESSION_USER,
    });
    mockPrisma.pickupNotice.findUnique.mockResolvedValueOnce(null);

    const req = new Request(
      `http://localhost/api/pickup-notices/${NOTICE_ID}`,
      { method: 'DELETE' }
    );
    const res = await deleteNotice(req as any, makeNoticeContext());

    expect(res.status).toBe(404);
  });

  it('returns 403 when notice belongs to a different user', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: SESSION_USER,
    });
    mockPrisma.pickupNotice.findUnique.mockResolvedValueOnce({
      id: NOTICE_ID,
      createdById: 'other_user',
      activityDay: { date: FUTURE_DATE },
    });

    const req = new Request(
      `http://localhost/api/pickup-notices/${NOTICE_ID}`,
      { method: 'DELETE' }
    );
    const res = await deleteNotice(req as any, makeNoticeContext());

    expect(res.status).toBe(403);
  });

  it('returns 400 when activity day has already passed', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: SESSION_USER,
    });
    mockPrisma.pickupNotice.findUnique.mockResolvedValueOnce({
      id: NOTICE_ID,
      createdById: SESSION_USER.id,
      activityDay: { date: PAST_DATE },
    });

    const req = new Request(
      `http://localhost/api/pickup-notices/${NOTICE_ID}`,
      { method: 'DELETE' }
    );
    const res = await deleteNotice(req as any, makeNoticeContext());

    expect(res.status).toBe(400);
  });

  it('soft deletes by setting deletedAt when the user owns the notice', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: SESSION_USER,
    });
    mockPrisma.pickupNotice.findUnique.mockResolvedValueOnce({
      id: NOTICE_ID,
      createdById: SESSION_USER.id,
      activityDay: { date: FUTURE_DATE },
    });
    mockPrisma.pickupNotice.update.mockResolvedValueOnce({
      id: NOTICE_ID,
      deletedAt: new Date(),
    });

    const req = new Request(
      `http://localhost/api/pickup-notices/${NOTICE_ID}`,
      { method: 'DELETE' }
    );
    const res = await deleteNotice(req as any, makeNoticeContext());

    expect(res.status).toBe(204);
    expect(mockPrisma.pickupNotice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: NOTICE_ID },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      })
    );
  });
});

// ---------------------------------------------------------------------------
// PUT /api/pickup-notices/[noticeId]
// ---------------------------------------------------------------------------

describe('PUT /api/pickup-notices/[noticeId]', () => {
  it('returns 401 when not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce(null);

    const req = new Request(
      `http://localhost/api/pickup-notices/${NOTICE_ID}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alternatePersonName: 'New Name',
          description: 'Updated',
        }),
      }
    );
    const res = await putNotice(req as any, makeNoticeContext());

    expect(res.status).toBe(401);
  });

  it('updates the notice when valid', async () => {
    const updatedNotice = {
      id: NOTICE_ID,
      alternatePersonName: 'New Name',
      description: 'Updated',
      deletedAt: null,
      acknowledgments: [],
    };

    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: SESSION_USER,
    });
    mockPrisma.pickupNotice.findUnique.mockResolvedValueOnce({
      id: NOTICE_ID,
      createdById: SESSION_USER.id,
      activityDay: { date: FUTURE_DATE },
    });
    mockPrisma.pickupNotice.update.mockResolvedValueOnce(updatedNotice);

    const req = new Request(
      `http://localhost/api/pickup-notices/${NOTICE_ID}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alternatePersonName: 'New Name',
          description: 'Updated',
        }),
      }
    );
    const res = await putNotice(req as any, makeNoticeContext());

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.alternatePersonName).toBe('New Name');
    expect(mockPrisma.pickupNotice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: NOTICE_ID },
        data: expect.objectContaining({ alternatePersonName: 'New Name' }),
      })
    );
  });
});

// ---------------------------------------------------------------------------
// POST /api/pickup-notices/[noticeId]/acknowledgments
// ---------------------------------------------------------------------------

describe('POST /api/pickup-notices/[noticeId]/acknowledgments', () => {
  it('returns 401 when not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce(null);

    const req = new Request(
      `http://localhost/api/pickup-notices/${NOTICE_ID}/acknowledgments`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Anotado' }),
      }
    );
    const res = await postAcknowledgment(req as any, makeNoticeContext());

    expect(res.status).toBe(401);
  });

  it('returns 404 when the notice does not exist', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: PROFESSOR_USER,
    });
    mockPrisma.pickupNotice.findUnique.mockResolvedValueOnce(null);

    const req = new Request(
      `http://localhost/api/pickup-notices/${NOTICE_ID}/acknowledgments`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Anotado' }),
      }
    );
    const res = await postAcknowledgment(req as any, makeNoticeContext());

    expect(res.status).toBe(404);
  });

  it('returns 403 when professor is not assigned to the activity day', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: PROFESSOR_USER,
    });
    mockPrisma.pickupNotice.findUnique.mockResolvedValueOnce({
      id: NOTICE_ID,
      activityDayId: DAY_ID,
      activityDay: { id: DAY_ID },
    });
    mockPrisma.activityDayProfessor.findFirst.mockResolvedValueOnce(null);

    const req = new Request(
      `http://localhost/api/pickup-notices/${NOTICE_ID}/acknowledgments`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Anotado' }),
      }
    );
    const res = await postAcknowledgment(req as any, makeNoticeContext());

    expect(res.status).toBe(403);
  });

  it('allows a professor to acknowledge a notice (creates or updates)', async () => {
    const ack = {
      id: 'ack_001',
      pickupNoticeId: NOTICE_ID,
      acknowledgedById: PROFESSOR_USER.id,
      notes: 'Anotado',
      confirmedAt: new Date(),
      acknowledgedBy: { id: PROFESSOR_USER.id, name: 'Prof' },
    };

    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: PROFESSOR_USER,
    });
    mockPrisma.pickupNotice.findUnique.mockResolvedValueOnce({
      id: NOTICE_ID,
      activityDayId: DAY_ID,
      activityDay: { id: DAY_ID },
    });
    mockPrisma.activityDayProfessor.findFirst.mockResolvedValueOnce({
      id: 'adp_001',
    });
    mockPrisma.pickupNoticeAcknowledgment.upsert.mockResolvedValueOnce(ack);

    const req = new Request(
      `http://localhost/api/pickup-notices/${NOTICE_ID}/acknowledgments`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Anotado' }),
      }
    );
    const res = await postAcknowledgment(req as any, makeNoticeContext());

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.acknowledgedById).toBe(PROFESSOR_USER.id);
    expect(json.notes).toBe('Anotado');
    expect(mockPrisma.pickupNoticeAcknowledgment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          pickupNoticeId_acknowledgedById: {
            pickupNoticeId: NOTICE_ID,
            acknowledgedById: PROFESSOR_USER.id,
          },
        },
        create: expect.objectContaining({
          pickupNoticeId: NOTICE_ID,
          acknowledgedById: PROFESSOR_USER.id,
          notes: 'Anotado',
        }),
        update: expect.objectContaining({ notes: 'Anotado' }),
      })
    );
  });

  it('idempotently updates an existing acknowledgment (upsert on repeat)', async () => {
    const updatedAck = {
      id: 'ack_001',
      pickupNoticeId: NOTICE_ID,
      acknowledgedById: PROFESSOR_USER.id,
      notes: 'Updated notes',
      confirmedAt: new Date(),
      acknowledgedBy: { id: PROFESSOR_USER.id, name: 'Prof' },
    };

    (getServerSession as jest.Mock).mockResolvedValueOnce({
      user: PROFESSOR_USER,
    });
    mockPrisma.pickupNotice.findUnique.mockResolvedValueOnce({
      id: NOTICE_ID,
      activityDayId: DAY_ID,
      activityDay: { id: DAY_ID },
    });
    mockPrisma.activityDayProfessor.findFirst.mockResolvedValueOnce({
      id: 'adp_001',
    });
    mockPrisma.pickupNoticeAcknowledgment.upsert.mockResolvedValueOnce(
      updatedAck
    );

    const req = new Request(
      `http://localhost/api/pickup-notices/${NOTICE_ID}/acknowledgments`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Updated notes' }),
      }
    );
    const res = await postAcknowledgment(req as any, makeNoticeContext());

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.notes).toBe('Updated notes');
    // upsert is called exactly once (no error on repeat)
    expect(mockPrisma.pickupNoticeAcknowledgment.upsert).toHaveBeenCalledTimes(
      1
    );
  });
});
