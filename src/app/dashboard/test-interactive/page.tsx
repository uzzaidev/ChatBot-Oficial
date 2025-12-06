/**
 * 🧪 Test Interactive Messages Dashboard
 * 
 * Page for testing WhatsApp Interactive Messages (Buttons and Lists)
 * 
 * Features:
 * - Send test buttons (up to 3)
 * - Send test lists (multiple sections)
 * - View API response
 * - Test validation errors
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Send, CheckCircle2, XCircle } from 'lucide-react'

type MessageType = 'buttons' | 'list'

interface ApiResponse {
  success?: boolean
  type?: string
  messageId?: string
  phone?: string
  timestamp?: string
  error?: string
  details?: string
}

export default function TestInteractivePage() {
  const [phone, setPhone] = useState('5554999999999')
  const [type, setType] = useState<MessageType>('buttons')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<ApiResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSend = async () => {
    setLoading(true)
    setError(null)
    setResponse(null)

    try {
      const res = await fetch('/api/test/interactive/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, type }),
      })

      const data = await res.json()

      if (res.ok) {
        setResponse(data)
      } else {
        setError(data.error || 'Unknown error')
        setResponse(data)
      }
    } catch (err: any) {
      setError(err.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">🧪 Test Interactive Messages</h1>
        <p className="text-gray-600">
          Test WhatsApp Business API Interactive Messages (Buttons and Lists)
        </p>
      </div>

      <div className="grid gap-6">
        {/* Configuration Card */}
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>
              Enter test parameters and select message type
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Phone Input */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="text"
                placeholder="5554999999999"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="font-mono"
              />
              <p className="text-sm text-gray-500">
                International format (no + or spaces)
              </p>
            </div>

            {/* Type Selector */}
            <div className="space-y-2">
              <Label htmlFor="type">Message Type</Label>
              <Select value={type} onValueChange={(value) => setType(value as MessageType)}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buttons">
                    Reply Buttons (3 buttons)
                  </SelectItem>
                  <SelectItem value="list">
                    List Message (2 sections, 4 items)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500">
                {type === 'buttons'
                  ? 'Sends 3 reply buttons: Support, Sales, Info'
                  : 'Sends a list with 2 sections and 4 options'}
              </p>
            </div>

            {/* Send Button */}
            <Button
              onClick={handleSend}
              disabled={loading || !phone}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Test Message
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Success Response */}
        {response?.success && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <div className="font-semibold text-green-800 mb-2">
                ✅ Message sent successfully!
              </div>
              <div className="text-sm space-y-1 text-gray-700">
                <p><strong>Type:</strong> {response.type}</p>
                <p><strong>Message ID:</strong> <code className="text-xs bg-white px-1 py-0.5 rounded">{response.messageId}</code></p>
                <p><strong>Phone:</strong> {response.phone}</p>
                <p><strong>Timestamp:</strong> {response.timestamp}</p>
              </div>
              <div className="mt-3 text-sm text-gray-600 border-t border-green-200 pt-2">
                📱 Check your WhatsApp to see the interactive message!
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Error Response */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription>
              <div className="font-semibold text-red-800 mb-2">
                ❌ Error sending message
              </div>
              <div className="text-sm text-gray-700">
                <p>{error}</p>
                {response?.details && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-gray-500">
                      View details
                    </summary>
                    <pre className="mt-2 text-xs bg-white p-2 rounded overflow-x-auto">
                      {response.details}
                    </pre>
                  </details>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Info Cards */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Reply Buttons</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p><strong>Limits:</strong></p>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>Maximum 3 buttons</li>
                <li>Button title: max 20 chars</li>
                <li>Body: max 1024 chars</li>
                <li>Footer: max 60 chars (optional)</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">List Messages</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p><strong>Limits:</strong></p>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>Maximum 10 sections</li>
                <li>Maximum 10 rows per section</li>
                <li>Maximum 100 total rows</li>
                <li>Row title: max 24 chars</li>
                <li>Row description: max 72 chars</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Testing Instructions</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <div>
              <p className="font-semibold mb-1">1. Send Test Message</p>
              <p className="text-gray-600">
                Enter your WhatsApp number (international format) and click &quot;Send Test Message&quot;
              </p>
            </div>

            <div>
              <p className="font-semibold mb-1">2. Check WhatsApp</p>
              <p className="text-gray-600">
                Open WhatsApp and verify you received the interactive message
              </p>
            </div>

            <div>
              <p className="font-semibold mb-1">3. Click Button/Item</p>
              <p className="text-gray-600">
                Click one of the buttons or select an item from the list
              </p>
            </div>

            <div>
              <p className="font-semibold mb-1">4. Check Webhook</p>
              <p className="text-gray-600">
                The webhook should receive the response with the clicked button/item ID
              </p>
            </div>

            <div className="border-t pt-3 mt-3">
              <p className="font-semibold mb-1">📝 Expected Response Format</p>
              <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
{`// Button Reply
{
  &quot;type&quot;: &quot;button_reply&quot;,
  &quot;id&quot;: &quot;test_btn_support&quot;,
  &quot;title&quot;: &quot;💬 Support&quot;
}

// List Reply
{
  &quot;type&quot;: &quot;list_reply&quot;,
  &quot;id&quot;: &quot;test_opt_support&quot;,
  &quot;title&quot;: &quot;Technical Support&quot;,
  &quot;description&quot;: &quot;Technical issues...&quot;
}`}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
