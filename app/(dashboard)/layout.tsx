/**
 * Dashboard Layout
 * 
 * 仪表板的主布局
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <header style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '16px 24px',
        marginBottom: '24px',
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <h1 style={{ margin: 0, fontSize: '24px', color: '#0f172a', fontWeight: 600 }}>
            智能销售助手
          </h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>
            AI-Powered Sales Lifecycle Management
          </p>
        </div>
      </header>
      
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px' }}>
        {children}
      </main>
    </div>
  );
}
