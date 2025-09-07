import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const CreateEdgeSchema = z.object({
  parentId: z.string().min(1),
  childId: z.string().min(1)
})

interface OrgStructure {
  user: any
  children: OrgStructure[]
  level: number
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all active edges
    const edges = await prisma.orgEdge.findMany({
      where: { validTo: null },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            active: true
          }
        },
        child: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            active: true
          }
        }
      },
      orderBy: [
        { parent: { name: 'asc' } },
        { child: { name: 'asc' } }
      ]
    })

    // Build organizational structure
    const structure = await buildOrgStructure()

    return NextResponse.json({
      success: true,
      edges,
      structure
    })

  } catch (error) {
    console.error('Get genealogy error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Genealogy-Daten' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = CreateEdgeSchema.parse(body)

    // Validate users exist and have correct roles
    const [parent, child] = await Promise.all([
      prisma.user.findUnique({
        where: { id: validatedData.parentId },
        select: { id: true, role: true, active: true }
      }),
      prisma.user.findUnique({
        where: { id: validatedData.childId },
        select: { id: true, role: true, active: true }
      })
    ])

    if (!parent || !parent.active) {
      return NextResponse.json({ error: 'Parent-Benutzer nicht gefunden oder inaktiv' }, { status: 400 })
    }

    if (!child || !child.active) {
      return NextResponse.json({ error: 'Child-Benutzer nicht gefunden oder inaktiv' }, { status: 400 })
    }

    if (parent.role !== 'TEAM_LEADER') {
      return NextResponse.json({ error: 'Parent muss ein Team Leader sein' }, { status: 400 })
    }

    if (!['TEAM_LEADER', 'SALES_REP'].includes(child.role)) {
      return NextResponse.json({ error: 'Child muss ein Team Leader oder Sales Rep sein' }, { status: 400 })
    }

    if (validatedData.parentId === validatedData.childId) {
      return NextResponse.json({ error: 'Parent und Child können nicht identisch sein' }, { status: 400 })
    }

    // Check if edge already exists
    const existingEdge = await prisma.orgEdge.findFirst({
      where: {
        parentId: validatedData.parentId,
        childId: validatedData.childId,
        validTo: null
      }
    })

    if (existingEdge) {
      return NextResponse.json({ error: 'Verbindung existiert bereits' }, { status: 400 })
    }

    // Check if child already has a parent
    const existingParent = await prisma.orgEdge.findFirst({
      where: {
        childId: validatedData.childId,
        validTo: null
      }
    })

    if (existingParent) {
      return NextResponse.json({ 
        error: 'Manager hat bereits einen übergeordneten Team Leader' 
      }, { status: 400 })
    }

    // Check for circular dependencies
    const wouldCreateCycle = await checkForCycle(validatedData.parentId, validatedData.childId)
    if (wouldCreateCycle) {
      return NextResponse.json({ 
        error: 'Diese Verbindung würde eine zirkuläre Abhängigkeit erstellen' 
      }, { status: 400 })
    }

    // Create the edge
    const edge = await prisma.orgEdge.create({
      data: {
        parentId: validatedData.parentId,
        childId: validatedData.childId,
        validFrom: new Date()
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        child: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    })

    // Rebuild organization relations
    await rebuildOrgRelations()

    return NextResponse.json({
      success: true,
      message: 'Organisationsverbindung erfolgreich erstellt',
      edge
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Ungültige Eingabedaten', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Create genealogy edge error:', error)
    return NextResponse.json(
      { error: 'Fehler beim Erstellen der Organisationsverbindung' },
      { status: 500 }
    )
  }
}

async function buildOrgStructure(): Promise<OrgStructure[]> {
  // Get all users who are Team Leaders or Sales Reps
  const users = await prisma.user.findMany({
    where: {
      role: { in: ['TEAM_LEADER', 'SALES_REP'] },
      active: true
    }
  })

  // Get all active edges
  const edges = await prisma.orgEdge.findMany({
    where: { validTo: null }
  })

  // Build adjacency map
  const childrenMap = new Map<string, string[]>()
  const hasParent = new Set<string>()

  edges.forEach(edge => {
    if (!childrenMap.has(edge.parentId)) {
      childrenMap.set(edge.parentId, [])
    }
    childrenMap.get(edge.parentId)!.push(edge.childId)
    hasParent.add(edge.childId)
  })

  // Find root users (users without parents)
  const rootUsers = users.filter(user => !hasParent.has(user.id))

  // Build structure recursively
  function buildNode(userId: string, level: number): OrgStructure | null {
    const user = users.find(u => u.id === userId)
    if (!user) return null

    const childIds = childrenMap.get(userId) || []
    const children = childIds
      .map(childId => buildNode(childId, level + 1))
      .filter(Boolean) as OrgStructure[]

    return {
      user,
      children,
      level
    }
  }

  return rootUsers
    .map(user => buildNode(user.id, 0))
    .filter(Boolean) as OrgStructure[]
}

async function checkForCycle(parentId: string, childId: string): Promise<boolean> {
  // Check if adding this edge would create a cycle
  // This happens if the parent is already a descendant of the child
  const relations = await prisma.orgRelation.findMany({
    where: {
      ancestorId: childId,
      descendantId: parentId
    }
  })

  return relations.length > 0
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