export function getTileSettings(tileId) {
  const data = localStorage.getItem(`tile_settings_${tileId}`);
  return data ? JSON.parse(data) : {};
}

export function saveTileSetting(tileId, key, value) {
  const current = getTileSettings(tileId);

  const updated = {
    ...current,
    [key]: value,
  };

  localStorage.setItem(
    `tile_settings_${tileId}`,
    JSON.stringify(updated)
  );

  return updated;
}
