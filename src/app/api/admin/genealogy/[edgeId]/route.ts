import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { edgeId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { edgeId } = params

    // Check if edge exists and is active
    const edge = await prisma.orgEdge.findUnique({
      where: { id: edgeId }
    })

    if (!edge) {
      return NextResponse.json({ error: 'Organisationsverbindung nicht gefunden' }, { status: 404 })
    }

    if (edge.validTo) {
      return NextResponse.json({ error: 'Verbindung ist bereits deaktiviert' }, { status: 400 })
    }

    // Deactivate the edge (don't delete, for audit purposes)
    await prisma.orgEdge.update({
      where: { id: edgeId },
      data: { validTo: new Date() }
    })

    // Rebuild organization relations
    await rebuildOrgRelations()

    return NextResponse.json({
      success: true,
      message: 'Organisationsverbindung erfolgreich entfernt'
    })

  } catch (error) {
    console.error('Delete genealogy edge error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Entfernen der Organisationsverbindung' },
      { status: 500 }
    )
  }
}

async function rebuildOrgRelations() {
  // Clear existing relations
  await prisma.orgRelation.deleteMany()

  // Get all active edges
  const edges = await prisma.orgEdge.findMany({
    where: { validTo: null }
  })

  // Build adjacency list
  const adjacencyList = new Map<string, string[]>()
  edges.forEach(edge => {
    if (!adjacencyList.has(edge.parentId)) {
      adjacencyList.set(edge.parentId, [])
    }
    adjacencyList.get(edge.parentId)!.push(edge.childId)
  })

  // For each user, find all their descendants using BFS
  const allUsers = await prisma.user.findMany({
    where: {
      role: { in: ['TEAM_LEADER', 'SALES_REP'] },
      active: true
    },
    select: { id: true }
  })

  for (const user of allUsers) {
    const descendants = new Map<string, number>() // descendantId -> depth
    const queue: Array<{ userId: string, depth: number }> = [{ userId: user.id, depth: 0 }]
    const visited = new Set<string>()

    while (queue.length > 0) {
      const { userId, depth } = queue.shift()!
      
      if (visited.has(userId)) continue
      visited.add(userId)

      const children = adjacencyList.get(userId) || []
      for (const childId of children) {
        const newDepth = depth + 1
        if (newDepth <= 3) { // Only track up to level C (depth 3)
          descendants.set(childId, newDepth)
          queue.push({ userId: childId, depth: newDepth })
        }
      }
    }

    // Create relations for all descendants
    const relationsToCreate = Array.from(descendants.entries()).map(([descendantId, depth]) => ({
      ancestorId: user.id,
      descendantId,
      depth
    }))

    if (relationsToCreate.length > 0) {
      await prisma.orgRelation.createMany({
        data: relationsToCreate
      })
    }
  }
}