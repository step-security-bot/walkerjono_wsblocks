import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { company } from '~~/server/database/schema/company'
import { logAuditEvent } from '~~/server/utils/auditLogger'
import { requireAuth } from '~~/server/utils/auth'

const schema = z.object({
  companyId: z.string().uuid(),
  reason: z.string().optional()
})

export default defineEventHandler(async (event) => {
  const session = await requireAuth(event)

  // Check if user is admin
  if (!session.user.email?.endsWith('@admin.com')) { // TODO: fix Temporary admin check, adjust based on your auth system
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: 'Only admins can deactivate companies'
    })
  }

  const body = await readValidatedBody(event, schema.parse)
  const db = await useDB(event)

  try {
    // Check if company exists
    const existingCompany = await db.select().from(company).where(eq(company.id, body.companyId)).limit(1)

    if (!existingCompany.length) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found',
        message: 'Company not found'
      })
    }

    // Update company status
    await db.update(company)
      .set({
        isActive: false,
        updatedAt: new Date(),
        updatedBy: session.user.id
      })
      .where(eq(company.id, body.companyId))

    // Log the audit event
    await logAuditEvent({
      userId: session.user.id,
      category: 'auth', // Using 'auth' as the category since 'company' is not allowed
      action: 'deactivate_company',
      targetType: 'company',
      targetId: body.companyId,
      status: 'success',
      details: body.reason
        ? `Deactivated company: ${existingCompany[0].name}. Reason: ${body.reason}`
        : `Deactivated company: ${existingCompany[0].name}`
    })

    // Fetch the updated company
    const updatedCompany = await db.select().from(company).where(eq(company.id, body.companyId)).limit(1)

    return {
      company: updatedCompany[0]
    }
  } catch (error) {
    // Log the audit event for failure
    await logAuditEvent({
      userId: session.user.id,
      category: 'auth', // Using 'auth' as the category since 'company' is not allowed
      action: 'deactivate_company',
      targetType: 'company',
      targetId: body.companyId,
      status: 'failure',
      details: `Failed to deactivate company: ${(error as Error).message}`
    })

    if ((error as any).statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Failed to deactivate company'
    })
  }
})
