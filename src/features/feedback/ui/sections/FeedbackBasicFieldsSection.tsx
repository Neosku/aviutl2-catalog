import React from 'react';
import { INPUT_CLASS, LABEL_CLASS, TEXTAREA_CLASS } from '../constants';
import type { FeedbackFieldChangeHandler } from '../types';

interface FeedbackBasicFieldNames {
  title: string;
  detail: string;
  contact: string;
}

interface FeedbackBasicFieldValues {
  title: string;
  detail: string;
  contact: string;
}

interface FeedbackBasicFieldsSectionProps {
  idPrefix: 'bug' | 'inq';
  names: FeedbackBasicFieldNames;
  values: FeedbackBasicFieldValues;
  onChange: FeedbackFieldChangeHandler;
  titlePlaceholder: string;
  detailPlaceholder: string;
  contactPlaceholder: string;
}

export default function FeedbackBasicFieldsSection({
  idPrefix,
  names,
  values,
  onChange,
  titlePlaceholder,
  detailPlaceholder,
  contactPlaceholder,
}: FeedbackBasicFieldsSectionProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className={LABEL_CLASS} htmlFor={`${idPrefix}-title`}>
          タイトル <span className="text-red-500">*</span>
        </label>
        <input
          id={`${idPrefix}-title`}
          name={names.title}
          value={values.title}
          onChange={onChange}
          required
          placeholder={titlePlaceholder}
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <label className={LABEL_CLASS} htmlFor={`${idPrefix}-detail`}>
          詳細 <span className="text-red-500">*</span>
        </label>
        <textarea
          id={`${idPrefix}-detail`}
          name={names.detail}
          value={values.detail}
          onChange={onChange}
          required
          placeholder={detailPlaceholder}
          className={TEXTAREA_CLASS}
        />
      </div>

      <div>
        <label className={LABEL_CLASS} htmlFor={`${idPrefix}-contact`}>
          連絡先 <span className="ml-1 text-xs font-normal text-slate-400">(任意)</span>
        </label>
        <input
          id={`${idPrefix}-contact`}
          name={names.contact}
          value={values.contact}
          onChange={onChange}
          placeholder={contactPlaceholder}
          className={INPUT_CLASS}
        />
      </div>
    </div>
  );
}
