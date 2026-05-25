import csv
import sys
from django.core.management.base import BaseCommand, CommandError
from documents.models import Document

# Map CSV column names to model field names
# This handles variations like "author" -> "authors", "panelist" -> "panelists"
COLUMN_ALIASES = {
    'author': 'authors',
    'authors': 'authors',
    'panelist': 'panelists',
    'panelists': 'panelists',
    'title': 'title',
    'year': 'year',
    'abstract': 'abstract',
    'course': 'course',
    'keywords': 'keywords',
}

VALID_COURSES = ['BSCS', 'BSIT', 'BSEMC']

class Command(BaseCommand):
    help = 'Import research documents from a CSV file'

    def add_arguments(self, parser):
        parser.add_argument('csv_file', type=str, help='Path to the CSV file')

    def handle(self, *args, **options):
        csv_path = options['csv_file']

        try:
            with open(csv_path, newline='', encoding='utf-8-sig') as csvfile:
                reader = csv.DictReader(csvfile)
                
                if not reader.fieldnames:
                    raise CommandError('CSV file is empty or has no headers')

                # Map the CSV headers to model field names
                headers = {h: h for h in reader.fieldnames}  # Start with original headers
                mapped_headers = {}
                for header in reader.fieldnames:
                    header_stripped = header.strip().lower()
                    if header_stripped in COLUMN_ALIASES:
                        mapped_headers[header] = COLUMN_ALIASES[header_stripped]
                    else:
                        mapped_headers[header] = header_stripped

                self.stdout.write(f'Column mapping: {mapped_headers}')
                self.stdout.write('-' * 60)

                # Check required columns exist
                required = ['title', 'authors', 'year', 'abstract', 'course', 'panelists']
                found_required = set(mapped_headers.values())
                missing = [r for r in required if r not in found_required]
                if missing:
                    self.stdout.write(self.style.ERROR(
                        f'Missing required columns: {missing}\n'
                        f'Make sure your CSV has headers for: {", ".join(required)}'
                    ))
                    return

                success_count = 0
                error_count = 0
                row_num = 1

                for row in reader:
                    row_num += 1
                    try:
                        # Build a clean data dict using mapped field names
                        data = {}
                        for original_col, mapped_col in mapped_headers.items():
                            value = row.get(original_col, '').strip()
                            data[mapped_col] = value

                        # Validate required fields
                        errors = []
                        if not data.get('title'):
                            errors.append('title is empty')
                        if not data.get('authors'):
                            errors.append('authors is empty')
                        if not data.get('year'):
                            errors.append('year is empty')
                        if not data.get('abstract'):
                            errors.append('abstract is empty')
                        if not data.get('course'):
                            errors.append('course is empty')
                        if not data.get('panelists'):
                            errors.append('panelists is empty')

                        if errors:
                            self.stdout.write(self.style.ERROR(
                                f'Row {row_num}: SKIPPED - {"; ".join(errors)}'
                            ))
                            error_count += 1
                            continue

                        # Validate year
                        try:
                            year_val = int(data['year'])
                            if year_val < 2019 or year_val > 2026:
                                raise ValueError
                        except (ValueError, TypeError):
                            self.stdout.write(self.style.ERROR(
                                f'Row {row_num}: SKIPPED - Invalid year "{data["year"]}" (must be 2019-2026)'
                            ))
                            error_count += 1
                            continue

                        # Validate course
                        course_val = data['course'].strip().upper()
                        if course_val not in VALID_COURSES:
                            self.stdout.write(self.style.ERROR(
                                f'Row {row_num}: SKIPPED - Invalid course "{data["course"]}" (must be BSCS, BSIT, or BSEMC)'
                            ))
                            error_count += 1
                            continue

                        # Create the document
                        Document.objects.create(
                            title=data['title'],
                            authors=data['authors'],
                            year=year_val,
                            abstract=data['abstract'],
                            course=course_val,
                            panelists=data['panelists'],
                            keywords=data.get('keywords', '') or '',
                        )

                        self.stdout.write(self.style.SUCCESS(
                            f'Row {row_num}: Imported "{data["title"]}"'
                        ))
                        success_count += 1

                    except Exception as e:
                        self.stdout.write(self.style.ERROR(
                            f'Row {row_num}: ERROR - {str(e)}'
                        ))
                        error_count += 1

                # Summary
                self.stdout.write('=' * 60)
                self.stdout.write(self.style.SUCCESS(f'Import complete!'))
                self.stdout.write(f'  Successfully imported: {success_count}')
                if error_count > 0:
                    self.stdout.write(self.style.WARNING(f'  Skipped/Errors: {error_count}'))
                else:
                    self.stdout.write(f'  Skipped/Errors: 0')

        except FileNotFoundError:
            raise CommandError(f'File not found: {csv_path}')
        except Exception as e:
            raise CommandError(f'Error reading CSV: {str(e)}')