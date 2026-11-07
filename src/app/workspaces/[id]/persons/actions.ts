"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/server/db";
import { getCurrentUserId } from "@/lib/auth/session";
import { PersonService } from "@/lib/server/person.service";
import {
  CreatePersonSchema,
  UpdatePersonSchema,
  AddRelationshipSchema,
  RelationshipType,
  Gender,
} from "@/contracts/person.contract";

export async function createPersonAction(formData: FormData): Promise<void> {
  const userId = await getCurrentUserId();
  const db = await getDb();
  const service = new PersonService(db);

  const workspaceId = formData.get("workspace_id") as string;
  const raw = {
    workspace_id: workspaceId,
    full_name: formData.get("full_name") as string,
    nick_name: (formData.get("nick_name") as string) || null,
    gender: (formData.get("gender") as Gender) || null,
    birth_date: (formData.get("birth_date") as string) || null,
    death_date: (formData.get("death_date") as string) || null,
    bio: (formData.get("bio") as string) || null,
  };

  const parsed = CreatePersonSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message || "Dữ liệu hồ sơ không hợp lệ.");
  }

  const person = await service.createPerson(userId, parsed.data);
  revalidatePath(`/workspaces/${workspaceId}/persons`);
  redirect(`/workspaces/${workspaceId}/persons/${person.id}`);
}

export async function updatePersonAction(formData: FormData): Promise<void> {
  const userId = await getCurrentUserId();
  const db = await getDb();
  const service = new PersonService(db);

  const workspaceId = formData.get("workspace_id") as string;
  const personId = formData.get("person_id") as string;

  const raw = {
    workspace_id: workspaceId,
    person_id: personId,
    full_name: formData.get("full_name") as string,
    nick_name: (formData.get("nick_name") as string) || null,
    gender: (formData.get("gender") as Gender) || null,
    birth_date: (formData.get("birth_date") as string) || null,
    bio: (formData.get("bio") as string) || null,
  };

  const parsed = UpdatePersonSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message || "Dữ liệu cập nhật không hợp lệ.");
  }

  await service.updatePerson(userId, parsed.data);
  revalidatePath(`/workspaces/${workspaceId}/persons/${personId}`);
  revalidatePath(`/workspaces/${workspaceId}/persons`);
}

export async function addRelationshipAction(formData: FormData): Promise<void> {
  const userId = await getCurrentUserId();
  const db = await getDb();
  const service = new PersonService(db);

  const workspaceId = formData.get("workspace_id") as string;
  const personId = formData.get("person_id") as string;
  const relatedPersonId = formData.get("related_person_id") as string;
  const relationshipType = formData.get("relationship_type") as RelationshipType;
  const notes = (formData.get("notes") as string) || null;

  const parsed = AddRelationshipSchema.safeParse({
    workspace_id: workspaceId,
    person_id: personId,
    related_person_id: relatedPersonId,
    relationship_type: relationshipType,
    notes,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.errors[0]?.message || "Dữ liệu quan hệ không hợp lệ.");
  }

  await service.addRelationship(userId, parsed.data);
  revalidatePath(`/workspaces/${workspaceId}/persons/${personId}`);
}

export async function deleteRelationshipAction(formData: FormData): Promise<void> {
  const userId = await getCurrentUserId();
  const db = await getDb();
  const service = new PersonService(db);

  const workspaceId = formData.get("workspace_id") as string;
  const personId = formData.get("person_id") as string;
  const relationshipId = formData.get("relationship_id") as string;

  await service.deleteRelationship(userId, workspaceId, relationshipId);
  revalidatePath(`/workspaces/${workspaceId}/persons/${personId}`);
}

export async function deletePersonAction(formData: FormData): Promise<void> {
  const userId = await getCurrentUserId();
  const db = await getDb();
  const service = new PersonService(db);

  const workspaceId = formData.get("workspace_id") as string;
  const personId = formData.get("person_id") as string;

  await service.deletePerson(userId, workspaceId, personId);
  revalidatePath(`/workspaces/${workspaceId}/persons`);
  redirect(`/workspaces/${workspaceId}/persons`);
}
