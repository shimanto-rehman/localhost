export interface MemberInfo {
  id: string;
  name: string;
  photoUrl?: string | null;
  isAdmin?: boolean;
  isBillManager?: boolean;
  isActive?: boolean;
  email?: string | null;
  phone?: string | null;
  permissions?: string[];
}

export interface ApartmentInfo {
  id: string;
  registrationId: string;
  name: string;
  address: string;
  aptFloor?: string | null;
  adminMemberId?: string | null;
  billManagerId?: string | null;
  currency?: string | null;
  members?: { id: string; name: string; photoUrl?: string | null }[];
}

export type BootstrapData = {
  apartment: ApartmentInfo;
  members: MemberInfo[];
  member: MemberInfo | null;
};

export function buildApartmentMemberPreview(members: MemberInfo[]) {
  return members
    .filter((m) => m.isActive !== false)
    .slice(0, 5)
    .map((m) => ({ id: m.id, name: m.name, photoUrl: m.photoUrl ?? null }));
}

export function patchBootstrapMembers(
  prev: BootstrapData,
  updater: (members: MemberInfo[]) => MemberInfo[],
): BootstrapData {
  const members = updater(prev.members);
  return {
    ...prev,
    members,
    apartment: prev.apartment
      ? { ...prev.apartment, members: buildApartmentMemberPreview(members) }
      : prev.apartment,
  };
}
