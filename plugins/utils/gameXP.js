/**
 * AstraX - plugins/utils/gameXP.js
 * Game XP System - XP, backgrounds, shop, stats
 */

import assets from '../commands/economy/assets.js'

export async function getGameUser(db, groupId, userId) {
  const key = `game_user_${groupId}_${userId}`
  const data = await db.get(key) || {
    xp: 0,
    background: 'black',
    wins: 0,
    losses: 0,
    draws: 0
  }
  return data
}

export async function addXP(db, groupId, userId, amount) {
  const user = await getGameUser(db, groupId, userId)
  user.xp += amount
  await db.set(`game_user_${groupId}_${userId}`, user)
  return user.xp
}

export async function addWin(db, groupId, userId) {
  const user = await getGameUser(db, groupId, userId)
  user.wins += 1
  user.xp += 50
  await db.set(`game_user_${groupId}_${userId}`, user)
  return user
}

export async function addLoss(db, groupId, userId) {
  const user = await getGameUser(db, groupId, userId)
  user.losses += 1
  user.xp += 10
  await db.set(`game_user_${groupId}_${userId}`, user)
  return user
}

export async function addDraw(db, groupId, userId) {
  const user = await getGameUser(db, groupId, userId)
  user.draws += 1
  user.xp += 20
  await db.set(`game_user_${groupId}_${userId}`, user)
  return user
}

export async function getInventory(db, userId) {
  const invKey = `game_inventory_${userId}`
  const inventory = await db.get(invKey) || ['black']
  return inventory
}

export async function buyBackground(db, groupId, userId, bgId) {
  const user = await getGameUser(db, groupId, userId)
  const bg = assets[bgId]

  if (!bg) return { success: false, error: 'Background not found' }
  if (bg.price === 0) return { success: false, error: 'This background is free' }
  
  const inventory = await getInventory(db, userId)
  if (inventory.includes(bgId)) return { success: false, error: 'You already own this' }
  
  if (user.xp < bg.price) return { success: false, error: 'Not enough XP' }

  user.xp -= bg.price
  inventory.push(bgId)

  await db.set(`game_user_${groupId}_${userId}`, user)
  await db.set(`game_inventory_${userId}`, inventory)

  return { success: true, newXP: user.xp, bg }
}

export async function setBackground(db, groupId, userId, bgId) {
  const inventory = await getInventory(db, userId)
  
  if (!inventory.includes(bgId)) return { success: false, error: 'You dont own this background' }

  const user = await getGameUser(db, groupId, userId)
  user.background = bgId
  await db.set(`game_user_${groupId}_${userId}`, user)

  return { success: true, background: bgId }
}

export async function getGameSettings(db, groupId) {
  const settings = await db.get(`game_settings_${groupId}`) || { picMode: false }
  return settings
}