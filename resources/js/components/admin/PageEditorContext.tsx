import { createContext, useContext } from 'react';
export const PageEditorContext = createContext('');
export const useEditedPage = () => useContext(PageEditorContext);

export const PageFieldsContext = createContext<Record<string, string>>({});
export const useEditedFields = () => useContext(PageFieldsContext);
