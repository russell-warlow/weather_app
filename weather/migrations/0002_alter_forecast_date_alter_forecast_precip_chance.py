# Generated by Django 5.0.6 on 2024-06-19 04:14

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('weather', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='forecast',
            name='date',
            field=models.DateTimeField(),
        ),
        migrations.AlterField(
            model_name='forecast',
            name='precip_chance',
            field=models.IntegerField(null=True),
        ),
    ]
