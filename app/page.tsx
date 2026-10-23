'use client'

import { useEffect, useMemo, useState } from 'react'
import { Bell, CalendarDays, ChevronLeft, ChevronRight, ClipboardList, DollarSign, ExternalLink, Filter, LayoutDashboard, Menu, Pencil, Plus, Search, Trash2, TrendingUp, X } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

const urlLogotipo = '/logo_montanha_2_VERSAO_2.png'
const urlSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const chaveSupabase = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
const configuracaoSupabaseIncompleta = Boolean(urlSupabase) !== Boolean(chaveSupabase)
const supabase = urlSupabase && chaveSupabase
  ? createClient(urlSupabase, chaveSupabase)
  : null
const categorias = ['Suporte', 'Instalação', 'Bug', 'Treinamento']
const progressoPorEstado = { Pendente: 0, 'Em andamento': 50, Concluído: 100 }
const hoje = new Date()
const saudacaoPorHorario = (hora: number) => hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
const dataLocal = (data: Date = new Date()) => `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`
const nomesMeses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

type Estado = keyof typeof progressoPorEstado
type Chamado = { id: string; codigo: string; cliente: string; descricao: string; categoria: string; data_atendimento: string; valor: number; progresso: number; status: Estado }

const iniciais: Chamado[] = [
  { id: '1', codigo: 'CH-1048', cliente: 'Mariana Costa', descricao: 'Ajuste de acesso ao sistema', categoria: 'Suporte', data_atendimento: dataLocal(), valor: 85, progresso: 100, status: 'Concluído' },
  { id: '2', codigo: 'CH-1047', cliente: 'Rafael Mendes', descricao: 'Configuração de impressora', categoria: 'Instalação', data_atendimento: dataLocal(), valor: 120, progresso: 100, status: 'Concluído' },
  { id: '3', codigo: 'CH-1046', cliente: 'Ana Beatriz', descricao: 'Erro no relatório financeiro', categoria: 'Bug', data_atendimento: dataLocal(), valor: 150, progresso: 50, status: 'Em andamento' },
]

export default function Pagina() {
  const [chamados, setChamados] = useState<Chamado[]>([])
  const [persistenciaPronta, setPersistenciaPronta] = useState(false)
  const [usuarioId, setUsuarioId] = useState<string | null>(null)
  const [autenticacaoPronta, setAuthPronta] = useState(!supabase)
  const [modoCadastro, setModoCadastro] = useState(false)
  const [modoRecuperacao, setModoRecuperacao] = useState(false)
  const [redefinindoSenha, setRedefinindoSenha] = useState(false)
  const [mensagemAutenticacao, setMensagemAuth] = useState('')
  const [autenticando, setAutenticando] = useState(false)
  const [mensagemDados, setMensagemDados] = useState(configuracaoSupabaseIncompleta ? 'Preencha NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY em .env.local para ativar a sincronização na nuvem.' : '')
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('Todos')
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<Chamado | null>(null)
  const [notificacoes, setNotificacoes] = useState(2)
  const [mes, setMes] = useState(hoje.getMonth())
  const [ano, setAno] = useState(hoje.getFullYear())
  const [diaSelecionado, setDiaSelecionado] = useState(hoje.getDate())

  useEffect(() => {
    if (!supabase) {
      try {
        const salvos = window.localStorage.getItem('chamatech-chamados')
        const registros = salvos ? JSON.parse(salvos) as unknown : null
        setChamados(Array.isArray(registros) ? registros as Chamado[] : iniciais)
      } catch {
        setChamados(iniciais)
      }
      setPersistenciaPronta(true)
      return
    }
    let ativo = true
    supabase.auth.getSession().then(({ data }) => {
      if (ativo) {
        setUsuarioId(data.session?.user.id ?? null)
        setAuthPronta(true)
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((evento, session) => {
      setUsuarioId(session?.user.id ?? null)
      if (evento === 'PASSWORD_RECOVERY') setRedefinindoSenha(true)
      setAuthPronta(true)
    })
    return () => { ativo = false; subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (!supabase || !usuarioId) return
    const cliente = supabase
    let ativo = true
    async function carregarDados() {
      setPersistenciaPronta(false)
      setMensagemDados('')
      const { data: chamadosSalvos, error } = await cliente.from('chamados').select('id,codigo,cliente,descricao,categoria,data_atendimento,valor,progresso,status').eq('user_id', usuarioId).order('data_atendimento', { ascending: false })
      if (!ativo) return
      if (error) {
        setMensagemDados('Não foi possível carregar os chamados do Supabase. Confira se executou supabase/schema.sql no SQL Editor do projeto.')
        setPersistenciaPronta(true)
        return
      }

      if (chamadosSalvos.length === 0) {
        let registrosLocais: Chamado[] = []
        try {
          const salvos = JSON.parse(window.localStorage.getItem('chamatech-chamados') || '[]') as unknown
          if (Array.isArray(salvos)) registrosLocais = salvos as Chamado[]
        } catch {
        }
        if (registrosLocais.length) {
          const importados = registrosLocais.map(({ id: _id, ...registro }) => ({ ...registro, user_id: usuarioId }))
          const { data: novos, error: erroImportacao } = await cliente.from('chamados').insert(importados).select('id,codigo,cliente,descricao,categoria,data_atendimento,valor,progresso,status')
          if (!ativo) return
          if (erroImportacao) {
            setMensagemDados('Não foi possível importar os chamados salvos neste navegador. Os dados locais continuam preservados.')
            setChamados(registrosLocais)
          } else {
            setChamados((novos || []) as Chamado[])
            window.localStorage.removeItem('chamatech-chamados')
          }
        } else {
          setChamados([])
        }
      } else {
        setChamados(chamadosSalvos as Chamado[])
      }
      setPersistenciaPronta(true)
    }
    carregarDados()
    return () => { ativo = false }
  }, [usuarioId])

  useEffect(() => {
    if (!supabase && persistenciaPronta) {
      window.localStorage.setItem('chamatech-chamados', JSON.stringify(chamados))
    }
  }, [chamados, persistenciaPronta])

  const filtrados = useMemo(() => chamados.filter((chamado) => {
    const texto = `${chamado.codigo} ${chamado.cliente} ${chamado.descricao}`.toLowerCase()
    return texto.includes(busca.toLowerCase()) && (filtro === 'Todos' || chamado.categoria === filtro)
  }), [chamados, busca, filtro])
  const concluidos = chamados.filter((chamado) => chamado.status === 'Concluído').length
  const total = chamados.reduce((soma, chamado) => soma + chamado.valor, 0)
  const mediaAvanco = chamados.length ? Math.round(chamados.reduce((soma, chamado) => soma + chamado.progresso, 0) / chamados.length) : 0
  const diasComServico = new Set(chamados.map((chamado) => chamado.data_atendimento)).size
  const diasNoMes = new Date(ano, mes + 1, 0).getDate()
  const primeiroDia = new Date(ano, mes, 1).getDay()
  const chaveDia = (dia: number) => `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
  const mudarMes = (direcao: number) => { const data = new Date(ano, mes + direcao, 1); setMes(data.getMonth()); setAno(data.getFullYear()); setDiaSelecionado(1) }
  function navegarPara(secao: string) {
    document.getElementById(secao)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function autenticar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || autenticando) return
    const dados = new FormData(event.currentTarget)
    const email = String(dados.get('email')).trim()
    const senha = String(dados.get('password'))
    setMensagemAuth('')
    setAutenticando(true)
    try {
      const resultado = modoCadastro
        ? await supabase.auth.signUp({ email, password: senha })
        : await supabase.auth.signInWithPassword({ email, password: senha })
      if (resultado.error) {
        const mensagem = resultado.error.message.toLowerCase()
        if (mensagem.includes('invalid login credentials')) {
          setMensagemAuth('E-mail ou senha incorretos. Confira os dados ou crie uma conta.')
        } else if (mensagem.includes('user already registered')) {
          setMensagemAuth('Este e-mail j? tem uma conta. Selecione ?Entrar?.')
        } else if (mensagem.includes('email not confirmed')) {
          setMensagemAuth('Confirme seu e-mail pelo link enviado para sua caixa de entrada e tente entrar novamente.')
        } else {
          setMensagemAuth(resultado.error.message)
        }
      } else if (modoCadastro && !resultado.data.session) {
        setMensagemAuth('Conta criada. Confirme seu e-mail pelo link enviado e depois entre.')
      }
    } catch {
      setMensagemAuth('N?o foi poss?vel conectar ao Supabase. Confira sua conex?o e tente novamente.')
    } finally {
      setAutenticando(false)
    }
  }

  async function solicitarRedefinicao(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || autenticando) return
    const dados = new FormData(event.currentTarget)
    const email = String(dados.get('email')).trim()
    setMensagemAuth('')
    setAutenticando(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
      setMensagemAuth(error ? `Não foi possível enviar o link: ${error.message}` : 'Se este e-mail estiver cadastrado, enviaremos um link para redefinir sua senha.')
    } catch {
      setMensagemAuth('Não foi possível conectar ao Supabase. Confira sua conexão e tente novamente.')
    } finally {
      setAutenticando(false)
    }
  }

  async function salvarNovaSenha(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase || autenticando) return
    const dados = new FormData(event.currentTarget)
    const senha = String(dados.get('new-password'))
    const confirmacao = String(dados.get('confirm-password'))
    if (senha !== confirmacao) {
      setMensagemAuth('As senhas não coincidem.')
      return
    }
    setMensagemAuth('')
    setAutenticando(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: senha })
      if (error) {
        setMensagemAuth(`Não foi possível atualizar a senha: ${error.message}`)
      } else {
        await supabase.auth.signOut()
        setUsuarioId(null)
        setRedefinindoSenha(false)
        setModoRecuperacao(false)
        setMensagemAuth('Senha atualizada. Entre com sua nova senha.')
      }
    } catch {
      setMensagemAuth('Não foi possível conectar ao Supabase. Confira sua conexão e tente novamente.')
    } finally {
      setAutenticando(false)
    }
  }

  async function adicionarChamado(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const dados = new FormData(event.currentTarget)
    const estado = String(dados.get('status') || 'Pendente') as Estado
    const registro = { codigo: `CH-${1050 + chamados.length}`, cliente: String(dados.get('cliente')), descricao: String(dados.get('descricao')), categoria: String(dados.get('categoria')), data_atendimento: String(dados.get('data')), valor: Number(dados.get('valor')), progresso: progressoPorEstado[estado], status: estado, ...(usuarioId ? { user_id: usuarioId } : {}) }
    const { data, error } = supabase ? await supabase.from('chamados').insert(registro).select().single() : { data: null, error: null }
    if (error) { window.alert('Não foi possível salvar o chamado. Verifique a conexão e tente novamente.'); return }
    setChamados((atuais) => [data ? data as Chamado : { ...registro, id: crypto.randomUUID() }, ...atuais])
    setModal(false)
  }

  async function atualizarChamado(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editando) return
    const dados = new FormData(event.currentTarget)
    const estado = String(dados.get('status') || 'Pendente') as Estado
    const atualizacao = { cliente: String(dados.get('cliente')), descricao: String(dados.get('descricao')), categoria: String(dados.get('categoria')), data_atendimento: String(dados.get('data')), valor: Number(dados.get('valor')), status: estado, progresso: progressoPorEstado[estado] }
    if (supabase) { const { error } = await supabase.from('chamados').update(atualizacao).eq('id', editando.id).eq('user_id', usuarioId); if (error) { window.alert('Não foi possível atualizar o chamado.'); return } }
    setChamados((atuais) => atuais.map((chamado) => chamado.id === editando.id ? { ...chamado, ...atualizacao } : chamado))
    setEditando(null)
  }

  function marcarDia(dia: number) {
    setDiaSelecionado(dia)
  }

  async function atualizarEstado(id: string, estado: Estado) {
    const progresso = progressoPorEstado[estado]
    const anterior = chamados.find((chamado) => chamado.id === id)
    setChamados((atuais) => atuais.map((chamado) => chamado.id === id ? { ...chamado, status: estado, progresso } : chamado))
    if (supabase) {
      const { data, error } = await supabase.from('chamados').update({ status: estado, progresso }).eq('id', id).eq('user_id', usuarioId).select('id').single()
      if (error || !data) {
        if (anterior) setChamados((atuais) => atuais.map((chamado) => chamado.id === id ? anterior : chamado))
        window.alert('N?o foi poss?vel atualizar o status no Supabase. Tente novamente.')
      }
    }
  }

  async function excluirChamado(chamado: Chamado) {
    if (!window.confirm(`Tem certeza que deseja excluir o chamado ${chamado.codigo}?`)) return
    if (supabase) {
      const { data, error } = await supabase.from('chamados').delete().eq('id', chamado.id).eq('user_id', usuarioId).select('id').single()
      if (error || !data) {
        window.alert('Não foi possível excluir o chamado. Tente novamente.')
        return
      }
    }
    setChamados((atuais) => atuais.filter((chamado) => chamado.id !== chamado.id))
    if (editando?.id === chamado.id) setEditando(null)
  }

  if (supabase && (!autenticacaoPronta || !usuarioId || redefinindoSenha)) return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fa] p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#163d62]">Chamados<span className="text-[#ef8d49]">.</span></h1>
          <div aria-label="Caio Sodr?" className="flex size-11 items-center justify-center rounded-full bg-[#f6d7bc] text-sm font-bold text-[#8b5132]">CS</div>
        </div>
        <p className="mt-2 text-sm text-slate-500">{!autenticacaoPronta ? 'Conectando ao Supabase...' : redefinindoSenha ? 'Redefina a senha da sua conta.' : modoRecuperacao ? 'Recupere o acesso à sua conta.' : 'Entre ou crie sua conta para acessar seus chamados.'}</p>
        {autenticacaoPronta && redefinindoSenha && <form onSubmit={salvarNovaSenha}>
          <p className="mt-5 text-sm font-semibold text-slate-700">Escolha uma nova senha para sua conta.</p>
          <label className="mt-4 block text-xs font-bold">Nova senha<input name="new-password" type="password" autoComplete="new-password" minLength={6} required className="mt-1 w-full rounded-lg border p-2.5 font-normal text-black" /></label>
          <label className="mt-3 block text-xs font-bold">Confirme a nova senha<input name="confirm-password" type="password" autoComplete="new-password" minLength={6} required className="mt-1 w-full rounded-lg border p-2.5 font-normal text-black" /></label>
          {mensagemAutenticacao && <p role="status" className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{mensagemAutenticacao}</p>}
          <button disabled={autenticando} className="mt-5 w-full rounded-xl bg-[#163d62] py-3 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60">{autenticando ? 'Aguarde...' : 'Salvar nova senha'}</button>
        </form>}
        {autenticacaoPronta && !redefinindoSenha && modoRecuperacao && <form onSubmit={solicitarRedefinicao}>
          <p className="mt-5 text-sm text-slate-600">Informe o e-mail da sua conta. Enviaremos um link para criar uma nova senha.</p>
          <label className="mt-4 block text-xs font-bold">E-mail<input name="email" type="email" autoComplete="email" required className="mt-1 w-full rounded-lg border p-2.5 font-normal text-black" /></label>
          {mensagemAutenticacao && <p role="status" className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{mensagemAutenticacao}</p>}
          <button disabled={autenticando} className="mt-5 w-full rounded-xl bg-[#163d62] py-3 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60">{autenticando ? 'Enviando...' : 'Enviar link de recuperação'}</button>
          <button type="button" onClick={() => { setModoRecuperacao(false); setMensagemAuth('') }} className="mt-3 w-full py-2 text-sm font-semibold text-[#163d62]">Voltar para entrar</button>
        </form>}
        {autenticacaoPronta && !redefinindoSenha && !modoRecuperacao && <form onSubmit={autenticar}>
          <div className="mt-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1" aria-label="Acesso ? conta">
            <button type="button" onClick={() => { setModoCadastro(false); setMensagemAuth('') }} aria-pressed={!modoCadastro} className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${!modoCadastro ? 'bg-white text-[#163d62] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Entrar</button>
            <button type="button" onClick={() => { setModoCadastro(true); setMensagemAuth('') }} aria-pressed={modoCadastro} className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${modoCadastro ? 'bg-white text-[#163d62] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Criar conta</button>
          </div>
          <label className="mt-5 block text-xs font-bold">E-mail<input name="email" type="email" autoComplete="email" required className="mt-1 w-full rounded-lg border p-2.5 font-normal text-black" /></label>
          <label className="mt-3 block text-xs font-bold">Senha<input name="password" type="password" autoComplete={modoCadastro ? 'new-password' : 'current-password'} minLength={6} required className="mt-1 w-full rounded-lg border p-2.5 font-normal text-black" /></label>
          {!modoCadastro && <button type="button" onClick={() => { setModoRecuperacao(true); setMensagemAuth('') }} className="mt-3 text-sm font-semibold text-[#163d62] hover:underline">Esqueci minha senha</button>}
          {mensagemAutenticacao && <p role="status" className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{mensagemAutenticacao}</p>}
          <button disabled={autenticando} className="mt-5 w-full rounded-xl bg-[#163d62] py-3 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60">{autenticando ? 'Aguarde...' : modoCadastro ? 'Criar minha conta' : 'Entrar'}</button>
        </form>}
      </div>
    </main>
  )

  return <div className="min-h-screen bg-[#f7f8fa] text-slate-900">
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-[252px] flex-col border-r border-slate-200 bg-white px-5 py-6 lg:flex">
      <div className="flex items-center gap-3 px-2"><img src={urlLogotipo} alt="Logo do portfólio" className="size-10 rounded-xl border border-orange-200 bg-white object-contain p-0.5" /><div><p className="text-[15px] font-bold tracking-tight">Chamados<span className="text-[#ef8d49]">.</span></p><p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">workspace</p></div></div>
      <nav className="mt-10 flex flex-col gap-2" aria-label="Menu principal"><p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Menu principal</p><button type="button" onClick={() => navegarPara('inicio')} className="flex items-center gap-3 rounded-xl bg-[#eaf1f7] px-3 py-3 text-sm font-semibold text-[#163d62]"><LayoutDashboard /> Visão geral</button><button type="button" onClick={() => navegarPara('calendario')} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-500 hover:bg-slate-50"><CalendarDays /> Calendário</button><button type="button" onClick={() => navegarPara('chamados')} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-500 hover:bg-slate-50"><ClipboardList /> Meus chamados <span className="ml-auto rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold">{chamados.length}</span></button></nav>
      <div className="mt-auto border-t border-slate-100 pt-5"><div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"><div className="flex size-9 items-center justify-center rounded-full bg-[#f6d7bc] text-xs font-bold text-[#8b5132]">CS</div><div><p className="text-xs font-bold">Caio Sodré</p><p className="text-[11px] text-slate-400">Técnico independente</p></div></div></div>
    </aside>
    <main className="lg:pl-[252px]"><header className="flex h-[76px] items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-8"><div className="flex items-center gap-3"><button className="lg:hidden" aria-label="Abrir menu"><Menu /></button><img src={urlLogotipo} alt="Logo do portfólio" className="size-10 rounded-xl border border-orange-200 bg-white object-contain p-0.5" /><div><p className="text-xs font-medium text-slate-400">{hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p><h1 className="text-lg font-bold tracking-tight">{saudacaoPorHorario(hoje.getHours())}, Caio</h1></div></div><div className="flex items-center gap-2">{supabase && <button onClick={() => supabase.auth.signOut()} className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50">Sair</button>}<button onClick={() => setNotificacoes(0)} className="relative flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500" aria-label="Notificações"><Bell />{notificacoes > 0 && <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-[#ef8d49] text-[9px] font-bold text-white">{notificacoes}</span>}</button></div></header>
      <div id="inicio" className="mx-auto max-w-[1400px] px-5 py-7 sm:px-8">{mensagemDados && <p role="alert" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{mensagemDados}</p>}<section className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-medium text-[#ef8d49]">Seu resumo mensal</p><h2 className="mt-1 text-3xl font-bold tracking-tight text-[#163d62]">Visão geral</h2><p className="mt-1 text-sm text-slate-500">Dados calculados diretamente dos seus chamados registrados.</p></div><div className="flex flex-wrap gap-2"><button onClick={() => setModal(true)} className="flex w-fit items-center gap-2 rounded-xl bg-[#ef8d49] px-4 py-2.5 text-sm font-bold text-white"><Plus /> Novo chamado</button><button onClick={() => filtrados[0] && setEditando(filtrados[0])} className="flex w-fit items-center gap-2 rounded-xl border border-[#163d62] px-4 py-2.5 text-sm font-bold text-[#163d62]"><Pencil /> Editar chamado</button></div></section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Indicador rotulo="Chamados atendidos" valor={String(concluidos)} ajuda={`${chamados.length} registrados no total`} icone={<ClipboardList />} /><Indicador rotulo="Dias trabalhados" valor={String(diasComServico)} ajuda="dias únicos com serviço" icone={<CalendarDays />} /><Indicador rotulo="Total a receber" valor={`R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} ajuda="soma dos valores registrados" icone={<DollarSign />} /><Indicador rotulo="Avanço médio" valor={`${mediaAvanco}%`} ajuda="progresso real dos chamados" icone={<TrendingUp />} /></section>
      <section id="calendario" className="mt-6 scroll-mt-6 grid gap-6 xl:grid-cols-[1.2fr_1fr]"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center justify-between"><div><h3 className="font-bold text-[#163d62]">Andamento no mês</h3><p className="mt-1 text-xs text-slate-400">Chamados registrados em {nomesMeses[mes].toLowerCase()}</p></div><span className="rounded-full bg-[#e7f6ef] px-3 py-1 text-xs font-bold text-emerald-600">{mediaAvanco}% de avanço médio</span></div><div className="mt-8 flex h-44 items-end gap-3">{[0, 1, 2, 3, 4].map((semana) => { const inicio = semana * 7 + 1; const fim = Math.min(inicio + 6, diasNoMes); const grupo = chamados.filter((chamado) => { const data = new Date(`${chamado.data_atendimento}T12:00:00`); return data.getFullYear() === ano && data.getMonth() === mes && data.getDate() >= inicio && data.getDate() <= fim }); const percentual = grupo.length ? Math.round(grupo.reduce((soma, chamado) => soma + chamado.progresso, 0) / grupo.length) : 0; return <div className="flex h-full flex-1 flex-col justify-end" key={semana}><div className="rounded-t-md bg-[#ef8d49] transition-all" title={`${grupo.length} chamados · ${percentual}% de avanço`} style={{ height: `${percentual || (grupo.length ? 6 : 2)}%` }} /><span className="mt-2 text-center text-[10px] text-slate-400">${inicio}-${fim}</span></div> })}</div><div className="mt-5 flex justify-between border-t border-slate-100 pt-4 text-xs text-slate-500"><span>{chamados.filter((chamado) => chamado.data_atendimento.startsWith(`${ano}-${String(mes + 1).padStart(2, '0')}`)).length} chamados no mês</span><strong className="text-[#163d62]">{concluidos} concluídos</strong></div></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center justify-between"><div><h3 className="font-bold text-[#163d62]">Calendário de trabalho</h3><p className="mt-1 text-xs text-slate-400">Hoje é {hoje.toLocaleDateString('pt-BR')}</p></div><CalendarDays className="text-[#ef8d49]" /></div><div className="mt-5 flex items-center justify-between"><button onClick={() => mudarMes(-1)} aria-label="Mês anterior"><ChevronLeft /></button><p className="text-sm font-bold text-[#163d62]">{nomesMeses[mes]} {ano}</p><button onClick={() => mudarMes(1)} aria-label="Próximo mês"><ChevronRight /></button></div><div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400">{['D','S','T','Q','Q','S','S'].map((d, i) => <span key={`${d}${i}`} className="py-1">{d}</span>)}{Array.from({ length: primeiroDia }).map((_, i) => <span key={`v${i}`} />)}{Array.from({ length: diasNoMes }, (_, i) => i + 1).map((dia) => <button key={dia} onClick={() => marcarDia(dia)} className={`relative aspect-square rounded-lg text-xs font-medium ${dia === diaSelecionado ? 'bg-[#163d62] text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{dia}{chamados.filter((chamado) => chamado.data_atendimento === chaveDia(dia)).length > 0 ? <span className="absolute bottom-1 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-[#ef8d49]" /> : null}</button>)}</div><p className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">Dia selecionado: <strong>{diaSelecionado}/{mes + 1}/{ano}</strong> · {chamados.filter((chamado) => chamado.data_atendimento === chaveDia(diaSelecionado)).length} chamados atendidos</p></div></section>
      <section id="chamados" className="mt-6 scroll-mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-bold text-[#163d62]">Chamados recentes</h3><p className="mt-1 text-xs text-slate-400">Pesquise por código, cliente ou descrição</p></div><div className="flex flex-wrap gap-2"><div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-400"><Search /><input value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar chamados" placeholder="Buscar chamado..." className="w-40 bg-transparent outline-none" /></div><select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"><option>Todos</option>{categorias.map((categoria) => <option key={categoria}>{categoria}</option>)}</select><button onClick={() => { setBusca(''); setFiltro('Todos') }} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold"><Filter /> Limpar</button></div></div><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left"><thead><tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400"><th className="px-6 py-3">Chamado</th><th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Categoria</th><th className="px-4 py-3">Data</th><th className="px-4 py-3">Avanço</th><th className="px-4 py-3">Valor</th><th className="px-4 py-3">Ações</th></tr></thead><tbody>{filtrados.map((chamado) => <tr key={chamado.id} className="border-b border-slate-50 text-sm hover:bg-slate-50"><td className="px-6 py-4"><strong className="text-[#163d62]">{chamado.codigo}</strong><p className="mt-1 text-xs text-slate-400">{chamado.descricao}</p></td><td className="px-4 py-4 font-medium">{chamado.cliente}</td><td className="px-4 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs">{chamado.categoria}</span></td><td className="px-4 py-4 text-xs text-slate-500">{new Date(`${chamado.data_atendimento}T12:00:00`).toLocaleDateString('pt-BR')}</td><td className="px-4 py-4"><div className="flex items-center gap-2"><div className="h-1.5 w-20 rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#ef8d49]" style={{ width: `${chamado.progresso}%` }} /></div><span className="text-xs font-bold">{chamado.progresso}%</span></div><p className="mt-1 text-[10px] text-slate-400">{chamado.status}</p></td><td className="px-4 py-4 font-bold text-[#163d62]">R$ {chamado.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td><td className="px-4 py-4"><button type="button" onClick={() => excluirChamado(chamado)} aria-label={`Excluir chamado ${chamado.codigo}`} title="Excluir chamado" className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button></td></tr>)}</tbody></table></div></section></div></main>
    <a href="https://caio-montanha.vercel.app/" target="_blank" rel="noreferrer" className="fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-full bg-[#ff6b16] p-2 pr-4 text-xs font-bold text-white shadow-lg shadow-orange-200 transition hover:scale-105"><img src={urlLogotipo} alt="Abrir portfólio" className="size-10 rounded-full bg-white object-contain p-1" /><span className="hidden sm:inline">Meu portfólio <ExternalLink /></span></a>
    {editando && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4"><form onSubmit={atualizarChamado} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"><div className="flex items-start justify-between"><div><h2 className="text-lg font-bold text-[#163d62]">Editar {editando.codigo}</h2><p className="mt-1 text-xs text-slate-400">Atualize os dados e o status deste chamado.</p></div><button type="button" onClick={() => setEditando(null)} aria-label="Fechar"><X /></button></div><div className="mt-5 flex flex-col gap-3"><label className="text-xs font-bold">Cliente<input name="cliente" defaultValue={editando.cliente} required className="mt-1 w-full rounded-lg border p-2.5 font-normal" /></label><label className="text-xs font-bold">O que foi feito<input name="descricao" defaultValue={editando.descricao} required className="mt-1 w-full rounded-lg border p-2.5 font-normal" /></label><div className="grid grid-cols-2 gap-3"><label className="text-xs font-bold">Categoria<select name="categoria" defaultValue={editando.categoria} className="mt-1 w-full rounded-lg border bg-white p-2.5 font-normal">{categorias.map((c) => <option key={c}>{c}</option>)}</select></label><label className="text-xs font-bold">Status<select name="status" defaultValue={editando.status} className="mt-1 w-full rounded-lg border bg-white p-2.5 font-normal"><option>Pendente</option><option>Em andamento</option><option>Concluído</option></select></label></div><div className="grid grid-cols-2 gap-3"><label className="text-xs font-bold">Data<input name="data" type="date" defaultValue={editando.data_atendimento} required className="mt-1 w-full rounded-lg border p-2.5 font-normal" /></label><label className="text-xs font-bold">Valor<input name="valor" type="number" min="0" step="0.01" defaultValue={editando.valor} required className="mt-1 w-full rounded-lg border p-2.5 font-normal" /></label></div></div><button className="mt-5 w-full rounded-xl bg-[#163d62] py-3 text-sm font-bold text-white">Salvar alterações</button></form></div>}
    {modal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4"><form onSubmit={adicionarChamado} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"><div className="flex items-start justify-between"><div><h2 className="text-lg font-bold text-[#163d62]">Novo chamado</h2><p className="mt-1 text-xs text-slate-400">Registre o atendimento e seu avanço.</p></div><button type="button" onClick={() => setModal(false)} aria-label="Fechar"><X /></button></div><div className="mt-5 flex flex-col gap-3"><label className="text-xs font-bold">Cliente<input name="cliente" required className="mt-1 w-full rounded-lg border p-2.5 font-normal" /></label><label className="text-xs font-bold">O que foi feito<input name="descricao" required className="mt-1 w-full rounded-lg border p-2.5 font-normal" /></label><div className="grid grid-cols-2 gap-3"><label className="text-xs font-bold">Categoria<select name="categoria" className="mt-1 w-full rounded-lg border bg-white p-2.5 font-normal">{categorias.map((c) => <option key={c}>{c}</option>)}</select></label><label className="text-xs font-bold">Status<select name="status" className="mt-1 w-full rounded-lg border bg-white p-2.5 font-normal"><option>Pendente</option><option>Em andamento</option><option>Concluído</option></select></label></div><div className="grid grid-cols-2 gap-3"><label className="text-xs font-bold">Data<input name="data" type="date" defaultValue={dataLocal(hoje)} required className="mt-1 w-full rounded-lg border p-2.5 font-normal" /></label><label className="text-xs font-bold">Valor<input name="valor" type="number" min="0" step="0.01" required className="mt-1 w-full rounded-lg border p-2.5 font-normal" /></label></div></div><button className="mt-5 w-full rounded-xl bg-[#163d62] py-3 text-sm font-bold text-white">Salvar chamado</button></form></div>}
  </div>
}

function Indicador({ icone, rotulo, valor, ajuda }: { icone: React.ReactNode; rotulo: string; valor: string; ajuda: string }) { return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex size-10 items-center justify-center rounded-xl bg-[#eaf1f7] text-[#163d62]">{icone}</div><p className="mt-5 text-xs font-medium text-slate-400">{rotulo}</p><p className="mt-1 text-2xl font-bold tracking-tight text-[#163d62]">{valor}</p><p className="mt-1 text-[11px] text-slate-400">{ajuda}</p></div> }
