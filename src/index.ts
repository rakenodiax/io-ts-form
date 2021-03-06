import {FormEvent, FormEventHandler, HTMLProps, useState} from 'react';
import * as t from 'io-ts';
import * as C from 'io-ts/Codec';
import * as D from 'io-ts/Decoder';
import * as E from 'fp-ts/Either';

const htmlInputExtractor = (e: FormEvent<HTMLInputElement>): HTMLInputElement['value'] =>
  e.currentTarget.value;

type UseFormValue<V extends object, K extends keyof V> = {
  form: Partial<FormData<K>>;
  data: V | null;
  setForm: (data: FormData<K>) => void;
  field: (name: K) => Partial<HTMLProps<HTMLInputElement>>;
  update: (name: K) => (event: FormEvent<HTMLInputElement>) => void;
  isValid: boolean;
  submit: (handler: (data: t.OutputOf<t.Type<V>>) => void) => FormEventHandler<HTMLFormElement>;
};

export type FormData<K extends string | number | symbol> = Record<K, HTMLInputElement['value']>;

export function useForm<V extends object, T extends t.OutputOf<t.Type<V>>, K extends keyof V>(
  codec: C.Codec<unknown, FormData<K>, T>,
): UseFormValue<V, K> {
  const [form, setForm] = useState<Partial<FormData<K>>>({});
  const [error, setError] = useState<D.DecodeError | null>(null);
  const [data, setData] = useState<T | null>(null);

  const isValid = error === null;

  const handleSubmit =
    (handler: (data: T) => void): FormEventHandler<HTMLFormElement> =>
    (event) => {
      event.preventDefault();

      if (typeof event.currentTarget === 'undefined') {
        return;
      }

      const formData: FormData<K> = [...new FormData(event.currentTarget).entries()].reduce(
        (acc, [k, v]) => ({...acc, [k]: v}),
        {} as FormData<K>,
      );

      const decoded = codec.decode(formData);

      if (E.isRight(decoded)) {
        handler(decoded.right);
      } else {
        setError(decoded.left);
      }
    };

  const handleSetForm = (form: FormData<K>) => {
    const decodeResult = codec.decode(form);
    const newForm = E.fold(
      () => form,
      (d) => codec.encode(d as T),
    )(decodeResult);
    setForm(newForm);

    if (E.isLeft(decodeResult)) {
      setData(null);
      setError(decodeResult.left);
    } else {
      setData(decodeResult.right);
      setError(null);
    }
  };

  const update =
    <K extends keyof V>(key: K) =>
    (event: FormEvent<HTMLInputElement>) => {
      handleSetForm({
        ...form,
        [key]: htmlInputExtractor(event),
      });
    };

  const field = (key: K) => ({
    onChange: update(key),
    value: form[key],
  });

  return {form, setForm: handleSetForm, data, submit: handleSubmit, field, update, isValid};
}
