import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import Signup from '../pages/Signup';

const mock = new MockAdapter(axios);

afterEach(() => mock.reset());

describe('Signup Page', () => {
  test('renders signup form with all fields', () => {
    render(<Signup />);
    expect(screen.getByText('Sign Up')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Full Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Phone')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Register' })).toBeInTheDocument();
  });

  test('course dropdown has correct options', () => {
    render(<Signup />);
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent('DevOps Engineering');
    expect(options[1]).toHaveTextContent('AI & Machine Learning');
  });

  test('form fields are required', () => {
    render(<Signup />);
    expect(screen.getByPlaceholderText('Full Name')).toBeRequired();
    expect(screen.getByPlaceholderText('Email')).toBeRequired();
    expect(screen.getByPlaceholderText('Phone')).toBeRequired();
  });

  test('allows user to fill in form fields', () => {
    render(<Signup />);
    fireEvent.change(screen.getByPlaceholderText('Full Name'), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Phone'), { target: { value: '1234567890' } });

    expect(screen.getByPlaceholderText('Full Name')).toHaveValue('John Doe');
    expect(screen.getByPlaceholderText('Email')).toHaveValue('john@example.com');
    expect(screen.getByPlaceholderText('Phone')).toHaveValue('1234567890');
  });

  test('shows success message on successful registration', async () => {
    mock.onPost('/api/signup').reply(201, { _id: '1', name: 'John' });
    render(<Signup />);

    fireEvent.change(screen.getByPlaceholderText('Full Name'), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Phone'), { target: { value: '1234567890' } });
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));

    await waitFor(() => {
      expect(screen.getByText('Registration successful!')).toBeInTheDocument();
    });
  });

  test('shows error message on failed registration', async () => {
    mock.onPost('/api/signup').reply(400, { error: 'Email already exists' });
    render(<Signup />);

    fireEvent.change(screen.getByPlaceholderText('Full Name'), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Phone'), { target: { value: '1234567890' } });
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));

    await waitFor(() => {
      expect(screen.getByText('Email already exists')).toBeInTheDocument();
    });
  });

  test('clears form after successful registration', async () => {
    mock.onPost('/api/signup').reply(201, { _id: '1' });
    render(<Signup />);

    fireEvent.change(screen.getByPlaceholderText('Full Name'), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Phone'), { target: { value: '1234567890' } });
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Full Name')).toHaveValue('');
      expect(screen.getByPlaceholderText('Email')).toHaveValue('');
      expect(screen.getByPlaceholderText('Phone')).toHaveValue('');
    });
  });

  test('course select changes value', () => {
    render(<Signup />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'AI & Machine Learning' } });
    expect(select).toHaveValue('AI & Machine Learning');
  });

  test('email input has type email', () => {
    render(<Signup />);
    expect(screen.getByPlaceholderText('Email')).toHaveAttribute('type', 'email');
  });

  test('shows generic error when no response data', async () => {
    mock.onPost('/api/signup').reply(500);
    render(<Signup />);
    fireEvent.change(screen.getByPlaceholderText('Full Name'), { target: { value: 'John' } });
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Phone'), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));
    await waitFor(() => {
      expect(screen.getByText('Registration failed')).toBeInTheDocument();
    });
  });
});
