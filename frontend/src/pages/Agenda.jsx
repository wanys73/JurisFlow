import { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import frLocale from '@fullcalendar/core/locales/fr';
import { evenementService, dossierService, googleCalendarService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import {
  Calendar as CalendarIcon,
  Plus,
  X,
  Trash2,
  Loader2,
  FileText,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const Agenda = () => {
  const { user } = useAuth();
  const calendarRef = useRef(null);
  const [evenements, setEvenements] = useState([]);
  const [googleEvents, setGoogleEvents] = useState([]);
  const [dossiers, setDossiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [selectedEvenement, setSelectedEvenement] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    titre: '',
    description: '',
    dateDebut: '',
    dateFin: '',
    typeEvenement: 'Tâche',
    dossierId: ''
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Charger les événements et dossiers au montage
  useEffect(() => {
    loadEvenements();
    loadDossiers();
  }, []);

  const loadEvenements = async (start, end) => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (start) params.start = start.toISOString();
      if (end) params.end = end.toISOString();
      
      // Charger les événements locaux
      const response = await evenementService.getEvenements(params);
      setEvenements(response.data.evenements || []);

      // Charger les événements Google Calendar si l'utilisateur a lié son compte
      if (user && user.googleAccessToken) {
        try {
          console.log('📅 Chargement des événements Google Calendar...');
          const googleResponse = await googleCalendarService.getGoogleEvents(start, end);
          if (googleResponse.success && googleResponse.data.events) {
            setGoogleEvents(googleResponse.data.events);
            console.log(`✅ ${googleResponse.data.events.length} événements Google chargés`);
          }
        } catch (googleErr) {
          console.error('⚠️ Erreur lors du chargement des événements Google (non bloquant):', googleErr);
          setGoogleEvents([]);
        }
      } else {
        setGoogleEvents([]);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des événements:', err);
      setError('Impossible de charger les événements');
    } finally {
      setLoading(false);
    }
  };

  const loadDossiers = async () => {
    try {
      const response = await dossierService.getDossiers();
      setDossiers(response.data.dossiers || []);
    } catch (err) {
      console.error('Erreur lors du chargement des dossiers:', err);
    }
  };

  // Convertir les événements au format FullCalendar (fusion Google + Locaux)
  const getCalendarEvents = () => {
    // Événements locaux
    const localEvents = evenements.map(evt => ({
      id: evt.id,
      title: evt.titre,
      start: evt.dateDebut,
      end: evt.dateFin,
      extendedProps: {
        description: evt.description,
        typeEvenement: evt.typeEvenement,
        dossier: evt.dossier,
        source: 'local'
      },
      backgroundColor: getEventColor(evt.typeEvenement),
      borderColor: getEventColor(evt.typeEvenement),
      classNames: ['fc-event-custom']
    }));

    // Événements Google Calendar (avec style distinct)
    const googleEventsFormatted = googleEvents.map(evt => ({
      id: `google-${evt.id}`,
      title: `📅 ${evt.titre}`,
      start: evt.dateDebut,
      end: evt.dateFin,
      extendedProps: {
        description: evt.description,
        source: 'google',
        googleEventId: evt.googleEventId,
        htmlLink: evt.htmlLink
      },
      backgroundColor: '#4285F4', // Bleu Google
      borderColor: '#4285F4',
      classNames: ['fc-event-google'],
      url: evt.htmlLink // Permet de cliquer pour ouvrir dans Google Calendar
    }));

    // Fusionner les deux sources
    return [...localEvents, ...googleEventsFormatted];
  };

  // Couleurs selon le type d'événement
  const getEventColor = (type) => {
    const colors = {
      'Audience': '#DC2626', // Rouge
      'Rendez-vous': '#2563EB', // Bleu
      'Échéance': '#EA580C', // Orange
      'Tâche': '#059669' // Vert
    };
    return colors[type] || '#6B7280';
  };

  // Rendu personnalisé des événements (style iOS)
  const renderEventContent = (eventInfo) => {
    const view = eventInfo.view.type;
    const color = eventInfo.backgroundColor;
    
    // Vue mois : style minimaliste avec dot ou bordure gauche
    if (view === 'dayGridMonth') {
      return (
        <div className="flex items-center space-x-1 px-1 py-0.5 overflow-hidden">
          <div 
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
          />
          <span className="text-xs font-medium text-secondary-900 truncate">
            {eventInfo.event.title}
          </span>
        </div>
      );
    }
    
    // Vue semaine/jour : style avec fond coloré
    return (
      <div className="px-2 py-1 h-full overflow-hidden">
        <div className="text-xs font-semibold text-white truncate">
          {eventInfo.timeText}
        </div>
        <div className="text-xs text-white font-medium truncate">
          {eventInfo.event.title}
        </div>
      </div>
    );
  };

  // Navigation personnalisée
  const handlePrev = () => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) calendarApi.prev();
  };

  const handleNext = () => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) calendarApi.next();
  };

  const handleToday = () => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) calendarApi.today();
  };

  const handleViewChange = (viewName) => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) calendarApi.changeView(viewName);
  };

  const [currentView, setCurrentView] = useState('dayGridMonth');

  // Gérer le clic sur une date (création)
  const handleDateClick = (arg) => {
    const dateDebut = new Date(arg.date);
    const dateFin = new Date(arg.date);
    dateFin.setHours(dateDebut.getHours() + 1);

    setModalMode('create');
    setSelectedEvenement(null);
    setFormData({
      titre: '',
      description: '',
      dateDebut: dateDebut.toISOString().slice(0, 16),
      dateFin: dateFin.toISOString().slice(0, 16),
      typeEvenement: 'Tâche',
      dossierId: ''
    });
    setFormError('');
    setIsModalOpen(true);
  };

  // Gérer le clic sur un événement (modification)
  const handleEventClick = (clickInfo) => {
    const event = clickInfo.event;
    const evenement = evenements.find(e => e.id === event.id);
    
    if (evenement) {
      setModalMode('edit');
      setSelectedEvenement(evenement);
      setFormData({
        titre: evenement.titre,
        description: evenement.description || '',
        dateDebut: new Date(evenement.dateDebut).toISOString().slice(0, 16),
        dateFin: new Date(evenement.dateFin).toISOString().slice(0, 16),
        typeEvenement: evenement.typeEvenement,
        dossierId: evenement.dossierId || ''
      });
      setFormError('');
      setIsModalOpen(true);
    }
  };

  // Gérer le drag-and-drop
  const handleEventDrop = async (dropInfo) => {
    try {
      const event = dropInfo.event;
      await evenementService.updateEvenement(event.id, {
        dateDebut: event.start.toISOString(),
        dateFin: event.end ? event.end.toISOString() : event.start.toISOString()
      });
      await loadEvenements();
    } catch (err) {
      console.error('Erreur lors du déplacement:', err);
      alert('Erreur lors du déplacement de l\'événement');
      dropInfo.revert();
    }
  };

  // Gérer le changement de plage de dates du calendrier
  const handleDatesSet = (dateInfo) => {
    loadEvenements(dateInfo.start, dateInfo.end);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    // Validation
    if (!formData.titre || !formData.dateDebut || !formData.dateFin) {
      setFormError('Le titre et les dates sont requis');
      setFormLoading(false);
      return;
    }

    const dateDebut = new Date(formData.dateDebut);
    const dateFin = new Date(formData.dateFin);
    if (dateFin < dateDebut) {
      setFormError('La date de fin doit être après la date de début');
      setFormLoading(false);
      return;
    }

    try {
      const dataToSend = {
        ...formData,
        dossierId: formData.dossierId || null
      };

      if (modalMode === 'create') {
        // Créer l'événement local
        await evenementService.createEvenement(dataToSend);
        
        // ✅ Si l'utilisateur a lié Google Calendar, créer aussi sur Google
        if (user && user.googleAccessToken) {
          try {
            console.log('📅 Synchronisation avec Google Calendar...');
            await googleCalendarService.createGoogleEvent(dataToSend);
            console.log('✅ Événement créé sur Google Calendar');
          } catch (googleErr) {
            console.error('⚠️ Erreur lors de la synchronisation avec Google (non bloquant):', googleErr);
            // Ne pas bloquer la création locale si Google échoue
          }
        }
      } else {
        await evenementService.updateEvenement(selectedEvenement.id, dataToSend);
      }

      handleCloseModal();
      await loadEvenements();
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      setFormError(err.response?.data?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEvenement) return;
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer l'événement "${selectedEvenement.titre}" ?`)) {
      return;
    }

    try {
      await evenementService.deleteEvenement(selectedEvenement.id);
      handleCloseModal();
      await loadEvenements();
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      alert('Erreur lors de la suppression de l\'événement');
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEvenement(null);
    setFormData({
      titre: '',
      description: '',
      dateDebut: '',
      dateFin: '',
      typeEvenement: 'Tâche',
      dossierId: ''
    });
    setFormError('');
  };

  return (
    <Layout>
      <style>{`
        /* Style iOS pour le calendrier */
        .fc {
          font-family: inherit;
        }
        
        /* Masquer le header par défaut de FullCalendar */
        .fc .fc-toolbar {
          display: none;
        }
        
        /* Style de la grille */
        .fc .fc-scrollgrid {
          border: 1px solid rgb(226 232 240);
          border-radius: 0.5rem;
        }
        
        /* Cellules de la grille */
        .fc .fc-daygrid-day,
        .fc .fc-timegrid-slot {
          border-color: rgb(241 245 249);
        }
        
        /* En-têtes des jours de la semaine */
        .fc .fc-col-header-cell {
          background-color: rgb(248 250 252);
          border-color: rgb(226 232 240);
          padding: 0.75rem 0.5rem;
          font-weight: 600;
          font-size: 0.875rem;
          color: rgb(100 116 139);
        }
        
        /* Numéros de jour */
        .fc .fc-daygrid-day-number {
          padding: 0.5rem;
          font-size: 0.875rem;
          color: rgb(51 65 85);
          font-weight: 500;
        }
        
        /* Aujourd'hui */
        .fc .fc-day-today {
          background-color: rgb(239 246 255) !important;
        }
        
        .fc .fc-day-today .fc-daygrid-day-number {
          background-color: rgb(59 130 246);
          color: white;
          width: 1.75rem;
          height: 1.75rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0.25rem;
        }
        
        /* Événements en vue mois - style iOS minimaliste */
        .fc-daygrid-event.fc-event-custom {
          background-color: white !important;
          border: none !important;
          border-radius: 0.25rem;
          padding: 0;
          margin-bottom: 2px;
          box-shadow: none;
        }
        
        .fc-daygrid-event.fc-event-custom:hover {
          background-color: rgb(249 250 251) !important;
        }
        
        /* Événements en vue semaine/jour - style avec couleur */
        .fc-timegrid-event.fc-event-custom {
          border-radius: 0.375rem;
          border: none;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        }
        
        .fc-timegrid-event.fc-event-custom:hover {
          filter: brightness(0.95);
        }
        
        /* Curseur pour les événements cliquables */
        .fc-event {
          cursor: pointer;
        }
        
        /* Plus d'événements */
        .fc .fc-more-link {
          font-size: 0.75rem;
          color: rgb(59 130 246);
          font-weight: 500;
          padding: 0.25rem 0.5rem;
        }
        
        /* Slots de temps */
        .fc .fc-timegrid-slot-label {
          font-size: 0.75rem;
          color: rgb(100 116 139);
        }
      `}</style>
      
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-secondary-900 mb-2">
                Agenda
              </h1>
              <p className="text-secondary-600">
                Gérez vos rendez-vous, audiences et échéances
              </p>
            </div>
          </div>
        </div>

        {/* Légende des types d'événements */}
        <div className="card p-4 mb-6">
          <div className="flex items-center space-x-6">
            <span className="text-sm font-medium text-secondary-700">Légende :</span>
            <div className="flex items-center space-x-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#DC2626' }}></div>
              <span className="text-sm text-secondary-600">Audience</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#2563EB' }}></div>
              <span className="text-sm text-secondary-600">Rendez-vous</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#EA580C' }}></div>
              <span className="text-sm text-secondary-600">Échéance</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#059669' }}></div>
              <span className="text-sm text-secondary-600">Tâche</span>
            </div>
          </div>
        </div>

        {/* Calendrier */}
        {error ? (
          <div className="card p-8 text-center text-red-600">
            {error}
          </div>
        ) : (
          <div className="card p-6">
            {/* Header personnalisé avec boutons Shadcn */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-secondary-200">
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePrev}
                  className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
                  title="Mois précédent"
                >
                  <ChevronLeft className="w-5 h-5 text-secondary-700" />
                </button>
                <button
                  onClick={handleNext}
                  className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
                  title="Mois suivant"
                >
                  <ChevronRight className="w-5 h-5 text-secondary-700" />
                </button>
                <button
                  onClick={handleToday}
                  className="btn-secondary ml-2"
                >
                  Aujourd'hui
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => { handleViewChange('dayGridMonth'); setCurrentView('dayGridMonth'); }}
                  className={currentView === 'dayGridMonth' ? 'btn-primary' : 'btn-secondary'}
                >
                  Mois
                </button>
                <button
                  onClick={() => { handleViewChange('timeGridWeek'); setCurrentView('timeGridWeek'); }}
                  className={currentView === 'timeGridWeek' ? 'btn-primary' : 'btn-secondary'}
                >
                  Semaine
                </button>
                <button
                  onClick={() => { handleViewChange('timeGridDay'); setCurrentView('timeGridDay'); }}
                  className={currentView === 'timeGridDay' ? 'btn-primary' : 'btn-secondary'}
                >
                  Jour
                </button>
              </div>
            </div>

            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={false}
              locale={frLocale}
              editable={true}
              selectable={true}
              selectMirror={true}
              dayMaxEvents={3}
              weekends={true}
              events={getCalendarEvents()}
              eventContent={renderEventContent}
              dateClick={handleDateClick}
              eventClick={handleEventClick}
              eventDrop={handleEventDrop}
              datesSet={handleDatesSet}
              height="auto"
              firstDay={1}
              slotMinTime="07:00:00"
              slotMaxTime="20:00:00"
              allDaySlot={false}
            />
          </div>
        )}

        {/* Modal de création/modification */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-secondary-200">
                <h2 className="text-2xl font-bold text-secondary-900">
                  {modalMode === 'create' ? 'Nouvel événement' : 'Modifier l\'événement'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-secondary-400 hover:text-secondary-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6">
                {formError && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {formError}
                  </div>
                )}

                <div className="space-y-4">
                  {/* Titre */}
                  <div>
                    <label htmlFor="titre" className="label">
                      Titre *
                    </label>
                    <input
                      type="text"
                      id="titre"
                      name="titre"
                      value={formData.titre}
                      onChange={handleChange}
                      required
                      className="input"
                      placeholder="Ex: Audience tribunal"
                    />
                  </div>

                  {/* Type d'événement */}
                  <div>
                    <label htmlFor="typeEvenement" className="label">
                      Type d'événement *
                    </label>
                    <select
                      id="typeEvenement"
                      name="typeEvenement"
                      value={formData.typeEvenement}
                      onChange={handleChange}
                      required
                      className="input"
                    >
                      <option value="Audience">Audience</option>
                      <option value="Rendez-vous">Rendez-vous</option>
                      <option value="Échéance">Échéance</option>
                      <option value="Tâche">Tâche</option>
                    </select>
                  </div>

                  {/* Date de début */}
                  <div>
                    <label htmlFor="dateDebut" className="label">
                      Date et heure de début *
                    </label>
                    <input
                      type="datetime-local"
                      id="dateDebut"
                      name="dateDebut"
                      value={formData.dateDebut}
                      onChange={handleChange}
                      required
                      className="input"
                    />
                  </div>

                  {/* Date de fin */}
                  <div>
                    <label htmlFor="dateFin" className="label">
                      Date et heure de fin *
                    </label>
                    <input
                      type="datetime-local"
                      id="dateFin"
                      name="dateFin"
                      value={formData.dateFin}
                      onChange={handleChange}
                      required
                      className="input"
                    />
                  </div>

                  {/* Dossier lié (optionnel) */}
                  <div>
                    <label htmlFor="dossierId" className="label">
                      Dossier lié (optionnel)
                    </label>
                    <select
                      id="dossierId"
                      name="dossierId"
                      value={formData.dossierId}
                      onChange={handleChange}
                      className="input"
                    >
                      <option value="">Aucun dossier</option>
                      {dossiers.map((dossier) => (
                        <option key={dossier.id} value={dossier.id}>
                          {dossier.nom}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  <div>
                    <label htmlFor="description" className="label">
                      Description
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={4}
                      className="input"
                      placeholder="Détails de l'événement..."
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-secondary-200">
                  <div>
                    {modalMode === 'edit' && (
                      <button
                        type="button"
                        onClick={handleDelete}
                        className="text-red-600 hover:text-red-800 font-medium flex items-center space-x-2 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Supprimer</span>
                      </button>
                    )}
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="btn-secondary"
                      disabled={formLoading}
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="btn-primary flex items-center space-x-2"
                      disabled={formLoading}
                    >
                      {formLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span>{modalMode === 'create' ? 'Créer' : 'Enregistrer'}</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Agenda;
