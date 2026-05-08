import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CanvasPage } from './pages/CanvasPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: Infinity,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CanvasPage />
    </QueryClientProvider>
  )
}
