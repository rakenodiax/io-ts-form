import {VFC} from 'react';
import {useForm} from '../src';
import {fireEvent, render} from '@testing-library/react';
import * as t from 'io-ts';
import * as C from 'io-ts/Codec';
import * as D from 'io-ts/Decoder';
import * as En from 'io-ts/Encoder';
import * as E from 'fp-ts/Either';
import {pipe} from 'fp-ts/function';

type Props = {
  decoder: D.Decoder<any, any>;
  encoder: En.Encoder<any, any>;
};

const Update: VFC<Props> = ({decoder, encoder}) => {
  const {form, update} = useForm<{test: string}, any, any>(C.make(decoder, encoder));

  const test = form['test'];

  return (
    <input data-testid="input" type="text" name="test" value={test} onChange={update('test')} />
  );
};

const Field: VFC<Props> = ({decoder, encoder}) => {
  const {field} = useForm<{test: string}, any, any>(C.make(decoder, encoder));

  return <input data-testid="input" type="text" {...field('test')} />;
};

const Validation: VFC<Props> = ({decoder, encoder}) => {
  const {field, isValid} = useForm<{test: string}, any, any>(C.make(decoder, encoder));

  return (
    <input
      data-testid="input"
      type="text"
      onChange={field('test').onChange}
      value={String(isValid)}
    />
  );
};

const HandleSubmit: VFC<Props & {handler: (data: any) => void}> = ({decoder, encoder, handler}) => {
  const {submit} = useForm(C.make(decoder, encoder));

  return (
    <form onSubmit={submit(handler)}>
      <input data-testid="input" type="text" name="test" />
      <button data-testid="submit" type="submit">
        Submit
      </button>
    </form>
  );
};

describe('useForm', () => {
  const testType = t.type({test: t.literal('test')});
  type TestType = t.OutputOf<typeof testType>;
  const decoder: D.Decoder<unknown, TestType> = {
    decode: (v) =>
      pipe(
        testType.decode(v),
        E.fold(
          (e) => D.failure(v, e.toString()),
          (v) => D.success(v),
        ),
      ),
  };
  const encoder = testType.asEncoder();

  describe('Values', () => {
    it('should update the form value when update is called', () => {
      const {getByTestId} = render(<Update decoder={decoder} encoder={encoder} />);

      fireEvent.change(getByTestId('input'), {target: {value: 'test'}});

      expect(getByTestId('input').getAttribute('value')).toEqual('test');
    });

    it('should update inputs created with field', () => {
      const {getByTestId} = render(<Field decoder={decoder} encoder={encoder} />);

      fireEvent.change(getByTestId('input'), {target: {value: 'test'}});

      expect(getByTestId('input').getAttribute('value')).toEqual('test');
    });
  });

  describe('Validation', () => {
    it('should validate on valid input', () => {
      const {getByTestId} = render(<Validation decoder={decoder} encoder={encoder} />);

      fireEvent.change(getByTestId('input'), {target: {value: 'test'}});

      expect(getByTestId('input').getAttribute('value')).toEqual('true');
    });

    it('should set isValid to false on invalid input', () => {
      const {getByTestId} = render(<Validation decoder={decoder} encoder={encoder} />);

      fireEvent.change(getByTestId('input'), {target: {value: 'tent'}});

      expect(getByTestId('input').getAttribute('value')).toEqual('false');
    });
  });

  describe('Uncontrolled', () => {
    it('should call the handler on a valid form', () => {
      const handler = jest.fn();

      const {getByTestId} = render(
        <HandleSubmit decoder={decoder} encoder={encoder} handler={handler} />,
      );

      fireEvent.change(getByTestId('input'), {target: {value: 'test'}});
      fireEvent.click(getByTestId('submit'));

      expect(handler).toHaveBeenCalledWith({test: 'test'});
    });

    it('should not call the handler if an invalid form', () => {
      const handler = jest.fn();

      const type = t.type({
        test: t.literal('test'),
      });
      const decoder: D.Decoder<unknown, t.OutputOf<typeof type>> = {
        decode: (v) =>
          pipe(
            type.decode(v),
            E.fold(
              (e) => D.failure(v, e.toString()),
              (v) => D.success(v),
            ),
          ),
      };

      const {getByTestId} = render(
        <HandleSubmit decoder={decoder} encoder={encoder} handler={handler} />,
      );

      fireEvent.change(getByTestId('input'), {target: {value: 'tent'}});
      fireEvent.click(getByTestId('submit'));

      expect(handler).toHaveBeenCalledTimes(0);
    });
  });
});
