'use client'

import { useState } from 'react'
import { useTheme } from 'next-themes'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, FileImage, FileText, FileSpreadsheet, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChartConfig, MetricDataPoint } from '@/lib/types/dashboard-metrics'

interface ExportDialogProps {
  charts: ChartConfig[]
  chartData: Record<string, MetricDataPoint[]>
  dashboardTitle?: string
  trigger?: React.ReactNode
}

type ExportFormat = 'png' | 'svg' | 'pdf' | 'excel' | 'csv'

/**
 * ExportDialog Component
 *
 * Dialog para exportar gráficos e dados do dashboard em múltiplos formatos:
 * - PNG: Gráfico individual como imagem
 * - SVG: Gráfico individual como vetor
 * - PDF: Dashboard completo ou relatório
 * - Excel: Dados em planilha
 * - CSV: Dados em formato CSV
 */
export function ExportDialog({
  charts,
  chartData,
  dashboardTitle = 'Dashboard UZZ.AI',
  trigger,
}: ExportDialogProps) {
  const [open, setOpen] = useState(false)
  const [exporting, setExporting] = useState<ExportFormat | null>(null)
  const { theme } = useTheme()
  const exportBgColor = theme === 'dark' ? '#1a1f26' : '#ffffff'

  const handleExport = async (format: ExportFormat, chartId?: string) => {
    setExporting(format)

    try {
      switch (format) {
        case 'png':
          if (chartId) {
            await exportChartAsPNG(chartId)
          } else {
            await exportDashboardAsPNG()
          }
          break

        case 'svg':
          if (chartId) {
            await exportChartAsSVG(chartId)
          }
          break

        case 'pdf':
          await exportDashboardAsPDF()
          break

        case 'excel':
          await exportDataAsExcel()
          break

        case 'csv':
          await exportDataAsCSV()
          break
      }
    } catch (error) {
      console.error(`Erro ao exportar como ${format}:`, error)
      alert(`Erro ao exportar como ${format}. Tente novamente.`)
    } finally {
      setExporting(null)
    }
  }

  // Export single chart as PNG
  const exportChartAsPNG = async (chartId: string) => {
    const chartElement = document.getElementById(`chart-${chartId}`)
    if (!chartElement) {
      throw new Error('Gráfico não encontrado')
    }

    const html2canvas = (await import('html2canvas')).default
    const canvas = await html2canvas(chartElement, {
      backgroundColor: exportBgColor,
      scale: 2,
      logging: false,
    })

    const url = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    const chart = charts.find((c) => c.id === chartId)
    link.download = `${chart?.title || 'grafico'}_${Date.now()}.png`
    link.href = url
    link.click()
  }

  // Export dashboard as PNG (all charts in one image)
  const exportDashboardAsPNG = async () => {
    const dashboardElement = document.getElementById('dashboard-metrics-view')
    if (!dashboardElement) {
      throw new Error('Dashboard não encontrado')
    }

    const html2canvas = (await import('html2canvas')).default
    const canvas = await html2canvas(dashboardElement, {
      backgroundColor: exportBgColor,
      scale: 1,
      logging: false,
      height: dashboardElement.scrollHeight,
    })

    const url = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.download = `${dashboardTitle.replace(/\s+/g, '_')}_${Date.now()}.png`
    link.href = url
    link.click()
  }

  // Export single chart as SVG
  const exportChartAsSVG = async (chartId: string) => {
    const chartElement = document.getElementById(`chart-${chartId}`)
    if (!chartElement) return

    const svgElement = chartElement.querySelector('svg')
    if (!svgElement) {
      throw new Error('SVG não encontrado no gráfico')
    }

    const svgData = new XMLSerializer().serializeToString(svgElement)
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const svgUrl = URL.createObjectURL(svgBlob)
    const link = document.createElement('a')
    const chart = charts.find((c) => c.id === chartId)
    link.download = `${chart?.title || 'grafico'}_${Date.now()}.svg`
    link.href = svgUrl
    link.click()
    URL.revokeObjectURL(svgUrl)
  }

  // Export dashboard as PDF
  const exportDashboardAsPDF = async () => {
    const { default: jsPDF } = await import('jspdf')
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 10
    const contentWidth = pageWidth - 2 * margin

    // Add title
    pdf.setFontSize(20)
    pdf.setTextColor(26, 188, 156) // UZZ.AI mint color
    pdf.text(dashboardTitle, margin, margin + 10)

    // Add date
    pdf.setFontSize(10)
    pdf.setTextColor(176, 176, 176) // Silver
    pdf.text(`Exportado em: ${new Date().toLocaleString('pt-BR')}`, margin, margin + 18)

    let yPosition = margin + 30

    // Export each chart
    for (const chart of charts) {
      const chartElement = document.getElementById(`chart-${chart.id}`)
      if (!chartElement) continue

      // Check if we need a new page
      if (yPosition > pageHeight - 100) {
        pdf.addPage()
        yPosition = margin
      }

      try {
        const html2canvas = (await import('html2canvas')).default
        const canvas = await html2canvas(chartElement, {
          backgroundColor: exportBgColor,
          scale: 1.5,
          logging: false,
        })

        const imgData = canvas.toDataURL('image/png')
        const imgWidth = contentWidth
        const imgHeight = (canvas.height * imgWidth) / canvas.width

        // Add chart title
        pdf.setFontSize(14)
        pdf.setTextColor(255, 255, 255)
        pdf.text(chart.title, margin, yPosition)
        yPosition += 8

        // Add chart image
        pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight)
        yPosition += imgHeight + 10
      } catch (error) {
        console.error(`Erro ao exportar gráfico ${chart.id}:`, error)
      }
    }

    pdf.save(`${dashboardTitle.replace(/\s+/g, '_')}_${Date.now()}.pdf`)
  }

  // Export data as Excel
  const exportDataAsExcel = async () => {
    const XLSX = await import('xlsx')
    const workbook = XLSX.utils.book_new()

    // Create a sheet for each chart
    charts.forEach((chart) => {
      const data = chartData[chart.id] || []
      if (data.length === 0) return

      // Convert data to worksheet format
      const worksheetData = data.map((point) => {
        const row: Record<string, any> = { Data: point.date }
        
        // Add all numeric values
        Object.keys(point).forEach((key) => {
          if (key !== 'date' && key !== 'label') {
            const value = point[key]
            if (typeof value === 'number') {
              row[key] = value
            } else if (typeof value === 'object' && value !== null) {
              // Handle nested objects (like byType)
              Object.entries(value).forEach(([subKey, subValue]) => {
                row[`${key}_${subKey}`] = subValue
              })
            }
          }
        })

        return row
      })

      const worksheet = XLSX.utils.json_to_sheet(worksheetData)
      XLSX.utils.book_append_sheet(workbook, worksheet, chart.title.substring(0, 31)) // Excel sheet name limit
    })

    // Save file
    XLSX.writeFile(workbook, `${dashboardTitle.replace(/\s+/g, '_')}_${Date.now()}.xlsx`)
  }

  // Export data as CSV
  const exportDataAsCSV = () => {
    const csvRows: string[] = []

    charts.forEach((chart) => {
      const data = chartData[chart.id] || []
      if (data.length === 0) return

      // Add chart title as header
      csvRows.push(`# ${chart.title}`)
      csvRows.push('')

      // Get all unique keys from data
      const allKeys = new Set<string>()
      data.forEach((point) => {
        Object.keys(point).forEach((key) => {
          if (key !== 'date') allKeys.add(key)
        })
      })

      // Create header row
      const headers = ['Data', ...Array.from(allKeys)]
      csvRows.push(headers.join(','))

      // Create data rows
      data.forEach((point) => {
        const row = [point.date]
        headers.slice(1).forEach((key) => {
          const value = point[key]
          if (typeof value === 'number') {
            row.push(value.toString())
          } else if (typeof value === 'object' && value !== null) {
            row.push(JSON.stringify(value))
          } else {
            row.push(value?.toString() || '')
          }
        })
        csvRows.push(row.join(','))
      })

      csvRows.push('')
      csvRows.push('')
    })

    const csvContent = csvRows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.download = `${dashboardTitle.replace(/\s+/g, '_')}_${Date.now()}.csv`
    link.href = URL.createObjectURL(blob)
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            className="border-border text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-card border-border text-foreground max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-poppins text-foreground">
            Exportar Dashboard
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Escolha o formato e o que deseja exportar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Gráficos Individuais */}
          {charts.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                Gráficos Individuais
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {charts.map((chart) => (
                  <div
                    key={chart.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border"
                  >
                    <span className="text-sm text-foreground">{chart.title}</span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleExport('png', chart.id)}
                        disabled={exporting === 'png'}
                        className="text-muted-foreground hover:text-foreground hover:bg-muted"
                      >
                        {exporting === 'png' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <FileImage className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleExport('svg', chart.id)}
                        disabled={exporting === 'svg'}
                        className="text-muted-foreground hover:text-foreground hover:bg-muted"
                      >
                        {exporting === 'svg' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <FileText className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dashboard Completo */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
              Dashboard Completo
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => handleExport('png')}
                disabled={exporting === 'png'}
                className="border-border text-muted-foreground hover:bg-muted hover:text-foreground justify-start"
              >
                {exporting === 'png' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileImage className="h-4 w-4 mr-2" />
                )}
                PNG (Imagem)
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport('pdf')}
                disabled={exporting === 'pdf'}
                className="border-border text-muted-foreground hover:bg-muted hover:text-foreground justify-start"
              >
                {exporting === 'pdf' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                PDF (Relatório)
              </Button>
            </div>
          </div>

          {/* Dados */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
              Dados
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => handleExport('excel')}
                disabled={exporting === 'excel'}
                className="border-border text-muted-foreground hover:bg-muted hover:text-foreground justify-start"
              >
                {exporting === 'excel' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                )}
                Excel (.xlsx)
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport('csv')}
                disabled={exporting === 'csv'}
                className="border-border text-muted-foreground hover:bg-muted hover:text-foreground justify-start"
              >
                {exporting === 'csv' ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                CSV (.csv)
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

