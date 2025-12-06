/**
 * 🧪 Test API Endpoint for Interactive Messages
 * 
 * Route: POST /api/test/interactive/send
 * 
 * Purpose: Test sending interactive messages (buttons and lists)
 * 
 * Usage:
 * ```bash
 * curl -X POST http://localhost:3000/api/test/interactive/send \
 *   -H "Content-Type: application/json" \
 *   -d '{"phone": "5554999999999", "type": "buttons"}'
 * ```
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  sendInteractiveButtons,
  sendInteractiveList,
} from '@/lib/whatsapp/interactiveMessages'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { phone, type } = body

    // Validation
    if (!phone) {
      return NextResponse.json(
        { error: 'Missing required field: phone' },
        { status: 400 }
      )
    }

    if (!type) {
      return NextResponse.json(
        { error: 'Missing required field: type (buttons or list)' },
        { status: 400 }
      )
    }

    // Test: Reply Buttons (3 buttons)
    if (type === 'buttons') {
      const result = await sendInteractiveButtons(phone, {
        body: '🤖 Welcome to our service! How can we help you today?',
        buttons: [
          {
            id: 'test_btn_support',
            title: '💬 Support',
          },
          {
            id: 'test_btn_sales',
            title: '🛒 Sales',
          },
          {
            id: 'test_btn_info',
            title: 'ℹ️ Info',
          },
        ],
        footer: 'Available 24/7',
      })

      return NextResponse.json({
        success: true,
        type: 'buttons',
        messageId: result.messageId,
        phone,
        timestamp: new Date().toISOString(),
      })
    }

    // Test: List Message (2 sections, 4 items)
    if (type === 'list') {
      const result = await sendInteractiveList(phone, {
        header: '📋 Service Menu',
        body: 'Please select the department you want to contact or the service you need:',
        buttonText: 'View Options',
        sections: [
          {
            title: '🏢 Departments',
            rows: [
              {
                id: 'test_opt_support',
                title: 'Technical Support',
                description: 'Technical issues and system questions',
              },
              {
                id: 'test_opt_sales',
                title: 'Sales',
                description: 'Quotes, purchases, and partnerships',
              },
            ],
          },
          {
            title: '📞 Quick Services',
            rows: [
              {
                id: 'test_opt_order_status',
                title: 'Order Status',
                description: 'Track your order in real-time',
              },
              {
                id: 'test_opt_cancel',
                title: 'Cancellation',
                description: 'Request order or service cancellation',
              },
            ],
          },
        ],
        footer: 'Service available 24/7',
      })

      return NextResponse.json({
        success: true,
        type: 'list',
        messageId: result.messageId,
        phone,
        timestamp: new Date().toISOString(),
      })
    }

    // Invalid type
    return NextResponse.json(
      {
        error: `Invalid type: "${type}". Must be "buttons" or "list"`,
      },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('❌ Test interactive send error:', error)

    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        details: error.stack,
      },
      { status: 500 }
    )
  }
}
