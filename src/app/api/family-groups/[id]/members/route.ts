import { NextResponse } from 'next/server';
import { familyGroupService } from '@/lib/services/family-group-service';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  return NextResponse.json(await familyGroupService.getMembersForFamilyGroup(params.id));
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  return NextResponse.json(await familyGroupService.addMemberToFamilyGroup(params.id, body.memberId));
}
