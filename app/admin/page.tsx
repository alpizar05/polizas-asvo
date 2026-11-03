'use client';

import {fields} from '@/lib/fields';
import { useEffect, useState } from 'react';
import { SessionProvider, useSession, signIn, signOut } from 'next-auth/react';

type Row = Record<string,string> & {
  id: string;
  date: string;
  name: string;
  email: string;
  phone: string;
  method: string;
  reference: string;
  status: string;
  reason: string;
};

type Admin = {
  email: string;
  role: string;
  active: boolean;
};

function Panel() {
  const { data: session, status } = useSession();
  const [rows, setRows] = useState<Row[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [role, setRole] = useState('');
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('REVIEWER');

  async function call(action: string, data: object = {}) {
    const r = await fetch('/api/admin/' + action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const j = await r.json();

    if (!r.ok) throw Error(j.error);
    return j;
  }

  async function load() {
    try {
      const j = await call('overview');
      setRows(j.rows);
      setRole(j.role);

      if (j.role === 'ADMIN') {
        setAdmins((await call('admins')).admins);
      }

      setError('');
    } catch (e) {
      setError(String(e));
    }
  }

  useEffect(() => {
    if (status === 'authenticated') load();
  }, [status]);

  async function review(id: string, decision: string) {
    const reason = decision === 'REJECTED' ? prompt('Motivo del rechazo:') : '';

    if (decision === 'REJECTED' && !reason?.trim()) return;
    if (!confirm('¿Confirmar esta acción?')) return;

    try {
      await call('review', { id, decision, reason });
      await load();
    } catch (e) {
      alert(String(e));
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();

    try {
      await call('addAdmin', { targetEmail: newEmail, role: newRole });
      setNewEmail('');
      await load();
    } catch (e) {
      alert(String(e));
    }
  }

  if (status === 'loading') {
    return <div className='admin'>Cargando…</div>;
  }

  if (!session) {
    return (
      <div className='login'>
        <h1>🔐 Administración ASVO</h1>
        <p>Acceso exclusivo para cuentas de Google autorizadas.</p>
        <button className='cta' onClick={() => signIn('google')}>
          Ingresar con Google
        </button>
        <p>
          <a href='/'>← Volver al formulario</a>
        </p>
      </div>
    );
  }

  const visible = rows.filter((r) =>
    [r.name, r.email, r.status, r.id]
      .join(' ')
      .toLowerCase()
      .includes(filter.toLowerCase()),
  );
  const approved = rows.filter((r) => r.status === 'APPROVED').length;

  return (
    <div className='admin'>
      <div className='admin-head'>
        <div>
          <h1>Panel de pólizas ASVO</h1>
          <p>
            {session.user?.email} · {role === 'ADMIN' ? 'Administrador' : 'Revisor'}
          </p>
        </div>
        <div>
          <button onClick={load}>Actualizar</button>{' '}
          <button onClick={() => signOut({ callbackUrl: '/' })}>Salir</button>
        </div>
      </div>

      {error && <p className='error'>{error}</p>}

      <div className='stats'>
        {[
          ['Inscripciones', rows.length],
          ['Pendientes', rows.filter((r) => r.status === 'PENDING').length],
          ['Confirmadas', approved],
          ['Recaudación verificada', '₡'+rows.filter(r=>r.status==='APPROVED').reduce((sum,r)=>sum+Number(r.selectedPolicy || 0),0).toLocaleString('es-CR')],
        ].map(([label, val]) => (
          <div key={label}>
            <strong>{val}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <div className='panel'>
        <div className='admin-head'>
          <h2>Solicitudes de renovación</h2>
          <input
            placeholder='Buscar…'
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <button
            onClick={() => {
              const data = [
                ['Código', 'Fecha', 'Estado', 'Motivo', ...fields.map(f=>f.label)],
                ...visible.map(r=>[r.id,r.date,r.status,r.reason,...fields.map(f=>r[f.name])]),
              ]
                .map((a) =>
                  a
                    .map((v) => {const text=String(v || '');return '"' + (/^[=+@\-]/.test(text)?"'":'') + text.replace(/"/g, '""') + '"';})
                    .join(','),
                )
                .join('\r\n');
              const url = URL.createObjectURL(
                new Blob(['\uFEFF' + data], {
                  type: 'text/csv;charset=utf-8',
                }),
              );
              const a = document.createElement('a');
              a.href = url;
              a.download = 'renovaciones-polizas.csv';
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Exportar CSV
          </button>
        </div>

        <div className='scroll'>
          <table>
            <thead>
              <tr>
                <th>Persona voluntaria</th>
                <th>Pago</th>
                <th>Estado</th>
                <th>Comprobante</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id}>
                  <td>
                    <b>{r.name}</b>
                    <small>
                      {r.email}
                      <br />
                      {r.phone}
                      <br />
                      {r.id}
                    </small>
                  </td>
                  <td>
                    {r.method}
                    <small>Referencia: {r.reference || 'Sin referencia'}</small><small>Póliza a pagar: ₡{Number(r.selectedPolicy).toLocaleString("es-CR")}</small>
                  </td>
                  <td>
                    <span className={'badge ' + r.status}>
                      {r.status === 'PENDING'
                        ? 'Pendiente'
                        : r.status === 'APPROVED'
                          ? 'Confirmado'
                          : 'Rechazado'}
                    </span>
                    <small>{r.reason}</small>
                  </td>
                  <td>
                    <a target="_blank" rel="noopener noreferrer" href={'/api/receipt/'+encodeURIComponent(r.id)}>Ver comprobante ↗</a>
                    <details><summary>Ver datos de la solicitud</summary>{fields.map(f=><p key={f.name}><b>{f.label}:</b> {r[f.name]}</p>)}</details>
                  </td>
                  <td>
                    {r.status === 'PENDING' ? (
                      <>
                        <button onClick={() => review(r.id, 'APPROVED')}>
                          ✓ Aprobar
                        </button>{' '}
                        <button onClick={() => review(r.id, 'REJECTED')}>
                          ✕ Rechazar
                        </button>
                      </>
                    ) : (
                      'Revisado'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {role === 'ADMIN' && (
        <div className='panel'>
          <h2>Administrar accesos</h2>
          <form className='admin-add' onSubmit={add}>
            <input
              type='email'
              placeholder='Cuenta Google'
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
            />
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
            >
              <option value='REVIEWER'>Revisor</option>
              <option value='ADMIN'>Administrador</option>
            </select>
            <button>Agregar</button>
          </form>
          {admins.map((a) => (
            <div className='admin-row' key={a.email}>
              {a.email} · {a.role} {a.active ? '' : '(deshabilitado)'}
              {a.email !== 'asvoorg@gmail.com' && a.active && (
                <button
                  onClick={async () => {
                    if (confirm('¿Deshabilitar?')) {
                      await call('removeAdmin', { targetEmail: a.email });
                      await load();
                    }
                  }}
                >
                  Deshabilitar
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Admin() {
  return (
    <SessionProvider>
      <Panel />
    </SessionProvider>
  );
}
