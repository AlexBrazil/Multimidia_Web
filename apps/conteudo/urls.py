from django.urls import path

from .views import course_data, index, progress_overview, progress_interaction

app_name = 'conteudo'

urlpatterns = [
    path('data.json', course_data, name='course-data'),
    path('progress/', progress_overview, name='progress-overview'),
    path('progress/interaction/', progress_interaction, name='progress-interaction'),
    path('', index, name='home'),
]
