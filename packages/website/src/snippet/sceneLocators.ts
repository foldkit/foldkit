import {
  altText,
  displayValue,
  label,
  placeholder,
  role,
  selector,
  testId,
  text,
  title,
} from 'foldkit/scene'

role('button', { name: 'Submit' })
label('Email')
text('Welcome back')
placeholder('Search...')
altText('Company logo')
title('Close dialog')
testId('cart-summary')
displayValue('alice@example.com')
selector('.fallback-class')
