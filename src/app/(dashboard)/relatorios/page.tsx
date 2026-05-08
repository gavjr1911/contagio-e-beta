"use client";

import { useState } from "react";
import Link from "next/link";
import { BarChart3, Music, Users, Calendar, Download, ListChecks, ArrowRight, FileText, FileSpreadsheet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/page-header";

export default function RelatoriosPage() {
  const [activeTab, setActiveTab] = useState("geral");

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Relatórios"
        description="Visualize estatísticas e métricas do sistema"
      />

      {/* Quick Access Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/relatorios/escalas">
          <Card className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ListChecks className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">Relatório de Escalas</CardTitle>
                  <CardDescription className="text-xs">
                    Exportar dados de escalas
                  </CardDescription>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mt-2">
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
                  <FileText className="h-3 w-3" /> PDF
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-secondary px-2 py-1 rounded">
                  <FileSpreadsheet className="h-3 w-3" /> Excel
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Voluntários
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">-</div>
            <p className="text-xs text-muted-foreground">
              Ativos no sistema
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Eventos este Mês
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">-</div>
            <p className="text-xs text-muted-foreground">
              Cultos e eventos especiais
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Músicas Cadastradas
            </CardTitle>
            <Music className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">-</div>
            <p className="text-xs text-muted-foreground">
              Na biblioteca
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxa de Confirmação
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">-</div>
            <p className="text-xs text-muted-foreground">
              Escalas confirmadas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto overflow-x-auto no-scrollbar justify-start">
          <TabsTrigger value="geral" className="whitespace-nowrap">
            <span className="hidden sm:inline">Visão Geral</span>
            <span className="sm:hidden">Geral</span>
          </TabsTrigger>
          <TabsTrigger value="voluntarios" className="whitespace-nowrap">
            <span className="hidden sm:inline">Voluntários</span>
            <span className="sm:hidden">Volunt.</span>
          </TabsTrigger>
          <TabsTrigger value="musicas" className="whitespace-nowrap">Músicas</TabsTrigger>
          <TabsTrigger value="escalas" className="whitespace-nowrap">Escalas</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Visão Geral</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <BarChart3 className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Gráficos e estatísticas serão exibidos aqui
                </p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Em desenvolvimento
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="voluntarios" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Relatório de Voluntários</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Users className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Participação por voluntário, ministério e período
                </p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Em desenvolvimento
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="musicas" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Relatório de Músicas</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Music className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Músicas mais tocadas, frequência e histórico
                </p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Em desenvolvimento
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="escalas" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Relatório de Escalas</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <ListChecks className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Histórico de escalas, confirmações e recusas
                </p>
                <Link href="/relatorios/escalas">
                  <Button className="mt-4 gap-2">
                    <ArrowRight className="h-4 w-4" />
                    Acessar Relatório de Escalas
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
