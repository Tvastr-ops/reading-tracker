import type { Book } from '../types/book';

export function getUnitLabel(bookType: string): string {
  switch (bookType) {
    case 'Light Novel':
      return 'chapters';
    case 'Web Novel':
    case 'Serial':
      return 'chapters';
    case 'Non-Fiction':
      return 'chapters';
    case 'Novel':
    default:
      return 'pages';
  }
}

export function formatProgressDisplay(book: Book): string {
  const label = getUnitLabel(book.type);
  const totalStr = book.total_units ? ` / ${book.total_units}` : '';

  if (book.type === 'Light Novel') {
    return `Ch. ${book.progress}${totalStr}`;
  } else if (book.type === 'Web Novel' || book.type === 'Serial') {
    return `Ch. ${book.progress}${totalStr}`;
  } else {
    return `${book.progress}${totalStr} ${label}`;
  }
}

export function getQuickChipOptions(bookType: string): number[] {
  switch (bookType) {
    case 'Light Novel':
    case 'Web Novel':
    case 'Serial':
      return [1, 2, 5, 10, 20];
    case 'Novel':
    case 'Non-Fiction':
    default:
      return [5, 10, 15, 25, 50];
  }
}
