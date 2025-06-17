import { eq } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'
import { z } from 'zod'
import { company, companyTypeEnum } from '~~/server/database/schema/company'
import { logAuditEvent } from '~~/server/utils/auditLogger'
import { requireAuth } from '~~/server/utils/auth'

const schema = z.object({
  name: z.string().min(3),
  type: z.enum(companyTypeEnum.enumValues),
  externalReference: z.string().optional(),
  isActive: z.boolean().default(true)
})

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)

  // Check if user is admin
  if (!session.user.email?.endsWith('@admin.com')) { // Temporary admin check, adjust based on your auth system
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'Only admins can create companies'
    })
  }

  const body = await readValidatedBody(event, schema.parse)
  const db = await useDB(event)

  const companyId = uuidv7()
  const now = new Date()

  try {
    await db.insert(company).values({
      id: companyId,
      name: body.name,
      type: body.type,
      isActive: body.isActive,
      externalReference: body.externalReference,
      createdAt: now,
      createdBy: session.user.id,
      updatedAt: now,
      updatedBy: session.user.id
    })

    // Log the audit event
    await logAuditEvent({
      userId: session.user.id,
      category: 'auth', // Using 'auth' as the category since 'company' is not allowed
      action: 'create_company',
      targetType: 'company',
      targetId: companyId,
      status: 'success',
      details: `Created company: ${body.name}`
    })

    // Fetch the created company
    const createdCompany = await db.select().from(company).where(eq(company.id, companyId)).limit(1)

    return {
      company: createdCompany[0]
    }
  } catch (error) {
    // Log the audit event for failure
    await logAuditEvent({
      userId: session.user.id,
      category: 'auth', // Using 'auth' as the category since 'company' is not allowed
      action: 'create_company',
      targetType: 'company',
      targetId: companyId,
      status: 'failure',
      details: `Failed to create company: ${(error as Error).message}`
    })

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Failed to create company'
    })
  }
})
