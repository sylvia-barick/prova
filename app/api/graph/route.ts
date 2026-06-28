import { NextResponse } from 'next/server'
import { client, TENANT_ID } from '@/lib/hydradb'

export async function GET(request: Request) {
  try {
    const res = await client.context.relations({ tenantId: TENANT_ID })
    const relations = res.data?.relations || []
    return NextResponse.json({ success: true, relations })
  } catch (error: any) {
    console.error('Failed to get graph relations:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
