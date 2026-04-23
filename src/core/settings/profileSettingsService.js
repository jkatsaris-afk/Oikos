import { supabase } from "../../auth/supabaseClient";

const PROFILE_BUCKET = "profile-images";

function mergeProfileMetadata(currentMetadata = {}, updates = {}) {
  return {
    ...currentMetadata,
    ...updates,
  };
}

export function getProfileExtras(profile) {
  const metadata = profile?.metadata && typeof profile.metadata === "object"
    ? profile.metadata
    : {};

  return {
    avatarUrl: metadata.avatar_url || "",
    avatarPath: metadata.avatar_path || "",
    phone: metadata.phone || "",
    bio: metadata.bio || "",
  };
}

export async function saveProfileSettings({
  userId,
  currentProfile,
  fullName,
  email,
  phone,
  bio,
}) {
  const metadata = mergeProfileMetadata(currentProfile?.metadata, {
    phone: phone || "",
    bio: bio || "",
  });

  const trimmedName = fullName.trim();
  const trimmedEmail = email.trim().toLowerCase();

  if (trimmedEmail && trimmedEmail !== (currentProfile?.email || "").toLowerCase()) {
    const { error: emailError } = await supabase.auth.updateUser({
      email: trimmedEmail,
      data: {
        full_name: trimmedName,
      },
    });

    if (emailError) {
      throw emailError;
    }
  } else {
    const { error: metadataError } = await supabase.auth.updateUser({
      data: {
        full_name: trimmedName,
      },
    });

    if (metadataError) {
      throw metadataError;
    }
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: userId,
      full_name: trimmedName,
      email: trimmedEmail,
      metadata,
    },
    {
      onConflict: "id",
    }
  );

  if (profileError) {
    throw profileError;
  }
}

export async function uploadProfileImage({ userId, currentProfile, file }) {
  const safeName = file.name.replace(/\s+/g, "-").toLowerCase();
  const filePath = `${userId}/${Date.now()}-${safeName}`;
  const currentMetadata =
    currentProfile?.metadata && typeof currentProfile.metadata === "object"
      ? currentProfile.metadata
      : {};

  const { error: uploadError } = await supabase.storage
    .from(PROFILE_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(PROFILE_BUCKET).getPublicUrl(filePath);

  if (currentMetadata.avatar_path) {
    await supabase.storage
      .from(PROFILE_BUCKET)
      .remove([currentMetadata.avatar_path]);
  }

  const metadata = mergeProfileMetadata(currentMetadata, {
    avatar_url: publicUrl,
    avatar_path: filePath,
  });

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: userId,
      full_name: currentProfile?.full_name || "",
      email: currentProfile?.email || "",
      metadata,
    },
    {
      onConflict: "id",
    }
  );

  if (profileError) {
    throw profileError;
  }

  return publicUrl;
}

export async function changeProfilePassword(password) {
  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    throw error;
  }
}
