# Standard library imports
import json

# Django imports
from django.contrib import messages
from django.db.models import Q
from django.http import HttpResponse
from django.shortcuts import render, get_object_or_404, redirect
from django.utils import timezone
from django.views.decorators.cache import cache_page
from django.views.decorators.http import require_http_methods

# Local imports
from .forms import PrenotazioneForm
from .models import (
    Opera, Autore, Evento, Notizia, Documento, 
    FotoArchivio, Itinerario, Prenotazione
)

def home_view(request):
    """Vista homepage con form prenotazione e contenuti in evidenza."""
    # Gestione form di contatto con validazione
    if request.method == 'POST':
        form = PrenotazioneForm(request.POST)
        if form.is_valid():
            try:
                prenotazione = form.save()
                messages.success(
                    request, 
                    'Prenotazione inviata con successo! Ti contatteremo presto via email.'
                )
                return redirect('home' + '#prenota-itinerario')
            except Exception as e:
                messages.error(request, 'Errore nel salvataggio. Riprova più tardi.')
        else:
            # Mostra errori di validazione
            for field, errors in form.errors.items():
                for error in errors:
                    if field == '__all__':
                        messages.error(request, error)
                    else:
                        field_label = form.fields[field].label or field
                        messages.error(request, f'{field_label}: {error}')
    else:
        form = PrenotazioneForm()

    # Eventi: prendere i prossimi eventi attivi (a partire da oggi) ordinati per data
    eventi_latest = Evento.objects.filter(is_active=True, data_inizio__gte=timezone.now()).order_by('data_inizio')[:4]

    # Notizie: prendere le ultime notizie attive ordinate per data di pubblicazione
    notizie_latest = Notizia.objects.filter(is_active=True).order_by('-data_pubblicazione')[:4]

    context = {
        'eventi': eventi_latest,
        'notizie': notizie_latest,
        'oggi': timezone.now().date().isoformat(),
    }
    return render(request, 'parco_verismo/index.html', context)

def biblioteca_view(request):
    """Mostra tutte le opere e gestisce la ricerca per titolo e autore."""
    query = request.GET.get('q', '')
    opere_list = Opera.objects.all()

    if query:
        # Cerca nel titolo dell'opera O nel nome dell'autore
        opere_list = opere_list.filter(
            Q(translations__titolo__icontains=query) | Q(autore__nome__icontains=query)
        ).distinct()

    context = {
        'opere': opere_list,
        'query': query,
    }
    return render(request, 'parco_verismo/biblioteca.html', context)

def opere_per_autore_view(request, autore_slug):
    """Pagina di presentazione delle opere di un singolo autore."""
    autore = get_object_or_404(Autore, slug=autore_slug)
    opere_autore = Opera.objects.filter(autore=autore)
    context = {
        'autore': autore,
        'opere': opere_autore,
    }
    return render(request, 'parco_verismo/opere_per_autore.html', context)

def opera_detail_view(request, slug):
    """Pagina di dettaglio della singola opera con trama e analisi."""
    opera = get_object_or_404(Opera, slug=slug)
    context = {
        'opera': opera,
    }
    return render(request, 'parco_verismo/opera_detail.html', context)


def eventi_view(request):
    """Mostra tutti gli eventi attivi ordinati per data con notizie."""
    eventi = Evento.objects.filter(is_active=True, data_inizio__gte=timezone.now()).order_by('data_inizio')
    notizie = Notizia.objects.filter(is_active=True).order_by('-data_pubblicazione')[:20]
    context = {
        'eventi': eventi,
        'notizie': notizie,
    }
    return render(request, 'parco_verismo/eventi.html', context)


def calendario_view(request):
    """Mostra il calendario degli eventi."""
    from django.utils import translation
    
    eventi = Evento.objects.filter(is_active=True).order_by('data_inizio')
    context = {
        'eventi': eventi,
        'LANGUAGE_CODE': translation.get_language(),
    }
    return render(request, 'parco_verismo/calendario.html', context)


def evento_detail_view(request, slug):
    """Pagina di dettaglio di un singolo evento."""
    evento = get_object_or_404(Evento, slug=slug, is_active=True)
    context = {
        'evento': evento,
    }
    return render(request, 'parco_verismo/evento_detail.html', context)


def notizie_view(request):
    """Mostra tutte le notizie attive ordinate per data di pubblicazione."""
    notizie = Notizia.objects.filter(is_active=True).order_by('-data_pubblicazione')
    eventi = Evento.objects.filter(is_active=True, data_inizio__gte=timezone.now()).order_by('data_inizio')[:20]
    context = {
        'notizie': notizie,
        'eventi': eventi,
    }
    return render(request, 'parco_verismo/notizie.html', context)


def notizia_detail_view(request, slug):
    """Pagina di dettaglio di una singola notizia."""
    notizia = get_object_or_404(Notizia, slug=slug, is_active=True)
    context = {
        'notizia': notizia,
    }
    return render(request, 'parco_verismo/notizia_detail.html', context)


def documenti_view(request):
    """Mostra tutti i documenti e studi attivi con filtri per tipo e ricerca."""
    documenti = Documento.objects.filter(is_active=True).order_by('-data_pubblicazione')
    
    # Filtro per tipo
    tipo_filter = request.GET.get('tipo', '')
    if tipo_filter:
        documenti = documenti.filter(tipo=tipo_filter)
    
    # Ricerca
    query = request.GET.get('q', '')
    if query:
        documenti = documenti.filter(
            Q(translations__titolo__icontains=query) |
            Q(translations__descrizione__icontains=query) |
            Q(autori__icontains=query) |
            Q(translations__parole_chiave__icontains=query)
        ).distinct()
    
    context = {
        'documenti': documenti,
        'query': query,
        'tipo_filter': tipo_filter,
    }
    return render(request, 'parco_verismo/documenti.html', context)


def documento_detail_view(request, slug):
    """Pagina di dettaglio di un singolo documento/studio."""
    documento = get_object_or_404(Documento, slug=slug, is_active=True)
    context = {
        'documento': documento,
    }
    return render(request, 'parco_verismo/documento_detail.html', context)


def archivio_fotografico_view(request):
    """Pagina dell'archivio fotografico con carosello e categorie."""
    foto = FotoArchivio.objects.filter(is_active=True).order_by('ordine', '-data_aggiunta')
    
    # Raggruppa per categoria se necessario
    categorie = foto.values_list('categoria', flat=True).distinct().exclude(categoria__isnull=True).exclude(categoria='')
    
    context = {
        'foto': foto,
        'categorie': categorie,
    }
    return render(request, 'parco_verismo/archivio_fotografico.html', context)


# =============================================================================
# VIEWS PER COMUNI DEL PARCO
# =============================================================================

def licodia_view(request):
    """Pagina dedicata al comune di Licodia Eubea."""
    return render(request, 'parco_verismo/licodia.html')


def mineo_view(request):
    """Pagina dedicata al comune di Mineo."""
    return render(request, 'parco_verismo/mineo.html')


def vizzini_view(request):
    """Pagina dedicata al comune di Vizzini."""
    return render(request, 'parco_verismo/vizzini.html')


# =============================================================================
# VIEWS ISTITUZIONALI E INFORMATIVE
# =============================================================================

def missione_visione_view(request):
    """Pagina Missione e Visione del Parco Letterario."""
    return render(request, 'parco_verismo/missione_visione.html')


def comitato_tecnico_scientifico_view(request):
    """Pagina del Comitato Tecnico-Scientifico del Parco Letterario."""
    return render(request, 'parco_verismo/comitato_tecnico_scientifico.html')


def comitato_regolamento_view(request):
    """Pagina del regolamento del Comitato Tecnico-Scientifico."""
    return render(request, 'parco_verismo/comitato_regolamento.html')


def regolamenti_documenti_view(request):
    """Pagina Regolamenti e Documenti del Parco."""
    return render(request, 'parco_verismo/regolamenti_documenti.html')


def partner_rete_territoriale_view(request):
    """Pagina Partner e Rete Territoriale."""
    return render(request, 'parco_verismo/partner_rete_territoriale.html')


def accrediti_finanziamenti_view(request):
    """Pagina Accrediti e Finanziamenti."""
    return render(request, 'parco_verismo/accrediti_finanziamenti.html')


# =============================================================================
# VIEWS PER ITINERARI
# =============================================================================

def itinerari_verghiani_view(request):
    """Lista degli itinerari di tipo 'verghiano'."""
    itinerari = Itinerario.objects.filter(is_active=True, tipo='verghiano').order_by('ordine', 'translations__titolo')
    
    # Prepara i dati per il template con serializzazione corretta
    itinerari_data = []
    for itinerario in itinerari:
        coordinate_tappe = itinerario.coordinate_tappe if itinerario.coordinate_tappe else []
        itinerari_data.append({
            'obj': itinerario,
            'coordinate_tappe_json': json.dumps(coordinate_tappe)
        })
    
    context = {
        'itinerari': itinerari,
        'itinerari_data': itinerari_data
    }
    return render(request, 'parco_verismo/itinerari_verghiani.html', context)


def itinerari_capuaniani_view(request):
    """Lista degli itinerari di tipo 'capuaniano'."""
    itinerari = Itinerario.objects.filter(is_active=True, tipo='capuaniano').order_by('ordine', 'translations__titolo')
    context = {'itinerari': itinerari}
    return render(request, 'parco_verismo/itinerari_verghiani.html', context)


def itinerari_tematici_view(request):
    """Lista degli itinerari di tipo 'tematico'."""
    itinerari = Itinerario.objects.filter(is_active=True, tipo='tematico').order_by('ordine', 'translations__titolo')
    context = {'itinerari': itinerari}
    return render(request, 'parco_verismo/itinerari_verghiani.html', context)


def itinerario_detail_view(request, slug):
    """Pagina di dettaglio di un singolo itinerario."""
    itinerario = get_object_or_404(Itinerario, slug=slug, is_active=True)
    context = {'itinerario': itinerario}
    # If you later create a dedicated detail template, change the template path here.
    return render(request, 'parco_verismo/itinerario_detail.html', context)


# =============================================================================
# VIEWS PER CONFORMITÀ GDPR E PA
# =============================================================================

def privacy_policy_view(request):
    """Pagina Privacy Policy conforme GDPR."""
    return render(request, 'parco_verismo/privacy_policy.html')


def note_legali_view(request):
    """Pagina Note Legali per PA."""
    return render(request, 'parco_verismo/note_legali.html')


def cookie_policy_view(request):
    """Pagina Cookie Policy."""
    return render(request, 'parco_verismo/cookie_policy.html')


def dichiarazione_accessibilita_view(request):
    """Dichiarazione di Accessibilità AGID obbligatoria per PA."""
    return render(request, 'parco_verismo/dichiarazione_accessibilita.html')
