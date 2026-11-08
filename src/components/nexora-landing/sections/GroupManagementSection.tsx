import { useRef, useState, type KeyboardEvent } from 'react';
import { CalendarDays, Check, ClipboardCheck, Clock3, Users, UserRound } from 'lucide-react';
import { SectionHeading } from '../ui';
import './groupManagementSection.css';

const GROUP_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'participants', label: 'Participants' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'attendance', label: 'Attendance' },
] as const;

type GroupTab = (typeof GROUP_TABS)[number]['id'];

const GROUP_CAPABILITIES = [
  {
    icon: CalendarDays,
    title: 'Create group sessions',
    description: 'Define a session name, activity, date, start time, duration and maximum capacity.',
  },
  {
    icon: Users,
    title: 'Manage participants',
    description: 'Add customers, review registrations and see confirmed, available and other participant statuses.',
  },
  {
    icon: UserRound,
    title: 'Coordinate staff and schedule',
    description: 'Assign responsible staff where supported and view the group session schedule.',
  },
  {
    icon: ClipboardCheck,
    title: 'Record attendance',
    description: 'Mark attendance, identify absences and keep a history of completed group sessions.',
  },
];

/** Local-only demonstration of a planned group-session workflow; it never saves. */
export function GroupManagementSection() {
  const [activeTab, setActiveTab] = useState<GroupTab>('overview');
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    let nextIndex = currentIndex;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % GROUP_TABS.length;
    else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + GROUP_TABS.length) % GROUP_TABS.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = GROUP_TABS.length - 1;
    else return;

    event.preventDefault();
    setActiveTab(GROUP_TABS[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <section
      className="sl-section sl-section--soft sl-group-management"
      id="group-management"
      aria-labelledby="sl-group-management-title"
    >
      <div className="sl-container">
        <div className="sl-group-management__intro">
          <SectionHeading
            eyebrow="GROUP SESSIONS & MULTIPLE PARTICIPANTS"
            id="sl-group-management-title"
            align="left"
            title="Manage Group Sessions and Multiple Participants in One Place."
            description="Planned for beauty businesses that run group appointments, workshops or classes: a single view for participants, capacity, scheduling and attendance. This multi-customer group workflow is not available in the live app today."
          />
          <span className="sl-group-management__status">
            <span aria-hidden="true" />
            PLANNED · NOT LIVE
          </span>
        </div>

        <div className="sl-group-management__preview-label">
          <span>ILLUSTRATIVE SESSION</span>
          <span>Interactive demo only · no data is saved</span>
        </div>

        <div className="sl-group-management__layout">
          <div className="sl-group-management__dashboard">
            <div className="sl-group-management__dashboard-top">
              <div>
                <span className="sl-group-management__eyebrow">GROUP SESSION MANAGER</span>
                <h3>Beauty &amp; Skin Care Workshop</h3>
              </div>
              <span className="sl-group-management__sample-tag">DEMO DATA</span>
            </div>

            <div className="sl-group-management__tabs" role="tablist" aria-label="Group management demo views">
              {GROUP_TABS.map(({ id, label }, index) => (
                <button
                  aria-controls="sl-group-management-panel"
                  aria-selected={activeTab === id}
                  id={`sl-group-management-tab-${id}`}
                  key={id}
                  onClick={() => setActiveTab(id)}
                  onKeyDown={(event) => handleTabKeyDown(event, index)}
                  ref={(element) => { tabRefs.current[index] = element; }}
                  role="tab"
                  tabIndex={activeTab === id ? 0 : -1}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>

            <div
              aria-labelledby={`sl-group-management-tab-${activeTab}`}
              className="sl-group-management__tabpanel"
              id="sl-group-management-panel"
              role="tabpanel"
              tabIndex={0}
            >
              {activeTab === 'overview' ? (
                <div className="sl-group-management__overview">
                  <div className="sl-group-management__overview-details">
                    <div><span>DATE</span><strong>15 December</strong></div>
                    <div><span>START TIME</span><strong>11:00 AM</strong></div>
                    <div><span>STAFF</span><strong>Not assigned in demo</strong></div>
                  </div>
                  <div className="sl-group-management__stats">
                    <div><strong>15</strong><span>Capacity</span></div>
                    <div><strong>11</strong><span>Registered</span></div>
                    <div><strong>4</strong><span>Available</span></div>
                  </div>
                  <p className="sl-group-management__tab-note">Illustrative values only · sample capacity and registration counts</p>
                </div>
              ) : null}

              {activeTab === 'participants' ? (
                <div className="sl-group-management__list-panel">
                  <div className="sl-group-management__list-heading">
                    <strong>Participants</strong>
                    <span>11 registered · sample</span>
                  </div>
                  {['Participant 01', 'Participant 02', 'Participant 03'].map((name, index) => (
                    <div className="sl-group-management__participant-row" key={name}>
                      <span className="sl-group-management__participant-avatar" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                      <span><strong>{name}</strong><small>Illustrative participant</small></span>
                      <span className="sl-group-management__confirmed">Confirmed · sample</span>
                    </div>
                  ))}
                  <p className="sl-group-management__tab-note">+ 8 additional demonstration entries · no customer records</p>
                </div>
              ) : null}

              {activeTab === 'schedule' ? (
                <div className="sl-group-management__schedule-panel">
                  <div className="sl-group-management__schedule-item">
                    <CalendarDays size={18} aria-hidden="true" />
                    <span><small>DATE</small><strong>15 December · sample</strong></span>
                  </div>
                  <div className="sl-group-management__schedule-item">
                    <Clock3 size={18} aria-hidden="true" />
                    <span><small>START TIME</small><strong>11:00 AM · sample</strong></span>
                  </div>
                  <div className="sl-group-management__schedule-item">
                    <UserRound size={18} aria-hidden="true" />
                    <span><small>RESPONSIBLE STAFF</small><strong>Not assigned in this illustration</strong></span>
                  </div>
                  <p className="sl-group-management__tab-note">Duration and staff assignment are not configured in this demo.</p>
                </div>
              ) : null}

              {activeTab === 'attendance' ? (
                <div className="sl-group-management__list-panel">
                  <div className="sl-group-management__list-heading">
                    <strong>Attendance</strong>
                    <span>Sample statuses · not recorded</span>
                  </div>
                  {[
                    ['Participant 01', 'Demo: present'],
                    ['Participant 02', 'Demo: absent'],
                    ['Participant 03', 'Demo: unmarked'],
                  ].map(([name, status]) => (
                    <div className="sl-group-management__attendance-row" key={name}>
                      <span><Check size={15} aria-hidden="true" /><strong>{name}</strong></span>
                      <small>{status}</small>
                    </div>
                  ))}
                  <p className="sl-group-management__tab-note">These sample statuses are not saved and do not represent real attendance.</p>
                </div>
              ) : null}
            </div>

            <p className="sl-group-management__dashboard-note">
              Planned interface preview only. Tabs switch local sample content; no booking, participant or attendance data is created or stored.
            </p>
          </div>

          <aside className="sl-group-management__phone" aria-label="Illustrative mobile participant screen with sample data">
            <div className="sl-group-management__phone-frame">
              <div className="sl-group-management__phone-notch" aria-hidden="true" />
              <div className="sl-group-management__phone-topline">
                <span className="sl-group-management__brand-mark" aria-hidden="true">N</span>
                <span><strong>NEXORA</strong><small>GROUP SESSION · DEMO</small></span>
              </div>
              <div className="sl-group-management__phone-session">
                <span>WORKSHOP · SAMPLE</span>
                <h4>Beauty &amp; Skin Care Workshop</h4>
                <p><CalendarDays size={13} aria-hidden="true" /> 15 December · 11:00 AM</p>
              </div>
              <div className="sl-group-management__phone-capacity">
                <div><span>Registered</span><strong>11 <small>/ 15</small></strong></div>
                <span>4 available · sample</span>
                <div className="sl-group-management__phone-progress" aria-hidden="true"><i /></div>
              </div>
              <div className="sl-group-management__phone-list-title">
                <strong>Participants</strong>
                <span>Illustrative list</span>
              </div>
              {['Participant 01', 'Participant 02', 'Participant 03'].map((name, index) => (
                <div className="sl-group-management__phone-participant" key={name}>
                  <span className="sl-group-management__phone-avatar" aria-hidden="true">{index + 1}</span>
                  <span><strong>{name}</strong><small>Sample registration</small></span>
                  <Check size={14} aria-hidden="true" />
                </div>
              ))}
              <p className="sl-group-management__phone-note">+ 8 demo participants · not real customer data</p>
            </div>
          </aside>
        </div>

        <div className="sl-group-management__capabilities">
          {GROUP_CAPABILITIES.map(({ icon: Icon, title, description }) => (
            <article className="sl-group-management__capability" key={title}>
              <span className="sl-group-management__capability-icon" aria-hidden="true"><Icon size={18} strokeWidth={1.8} /></span>
              <h3>{title}</h3>
              <p>{description}</p>
              <span className="sl-group-management__planned-label">Planned</span>
            </article>
          ))}
        </div>

        <p className="sl-group-management__disclosure">
          Group appointments with multiple customers, participant registration, capacity management and attendance tracking are not live product capabilities. This page is a planned-feature illustration only.
        </p>
      </div>
    </section>
  );
}
