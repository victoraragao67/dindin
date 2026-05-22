'use client'

import { useEffect, createContext, useContext, useState } from 'react'

type Tema = 'light' | 'dark'

const ThemeContext = createContext<{
  tema: Tema
  setTema: (t: Tema) => void
}>({ tema: 'light', setTema: () => {} })

export function ThemeProvider({
  children,
  initialTema,
}: {
  children: React.ReactNode
  initialTema: Tema
}) {
  const [tema, setTema] = useState<Tema>(initialTema)

  useEffect(() => {
    document.documentElement.dataset.theme = tema
  }, [tema])

  // Sincroniza quando o servidor manda um tema diferente (ex: troca de usuário)
  useEffect(() => {
    document.documentElement.dataset.theme = initialTema
    setTema(initialTema)
  }, [initialTema])

  return (
    <ThemeContext.Provider value={{ tema, setTema }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
